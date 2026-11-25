import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SupabaseIdentity } from "./supabaseToken";
import { userForSupabase } from "./supabaseUser";
import type { AuthUser } from "./userLookup";

const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("../../config/prisma", () => ({ prisma: db }));
vi.mock("../../config/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const AUTH_ID = "6b1f5a0e-3c2d-4e8f-9a7b-1c2d3e4f5a6b";

function row(part: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    authId: null,
    email: "anna@example.com",
    name: "Anna de Vries",
    roles: ["user"],
    active: true,
    ...part,
  };
}

/** The common case: a Microsoft sign-in, the first request right after it. */
function identity(part: Partial<SupabaseIdentity> = {}): SupabaseIdentity {
  return {
    authId: AUTH_ID,
    email: "anna@example.com",
    provider: "azure",
    viaMicrosoft: true,
    nameAfterSignIn: null,
    freshSignIn: true,
    ...part,
  };
}

function uniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint", {
    code: "P2002",
    clientVersion: "test",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  db.user.findMany.mockResolvedValue([]);
  db.user.updateMany.mockResolvedValue({ count: 1 });
});

describe("userForSupabase", () => {
  it("returns a user known by Supabase id", async () => {
    db.user.findUnique.mockResolvedValueOnce(row({ authId: AUTH_ID }));

    const user = await userForSupabase(identity());

    expect(user.authId).toBe(AUTH_ID);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("links an existing account by email address", async () => {
    db.user.findUnique.mockResolvedValueOnce(null);
    db.user.findMany.mockResolvedValueOnce([row()]);

    const user = await userForSupabase(
      identity({ email: " ANNA@example.com " }),
    );

    expect(user.authId).toBe(AUTH_ID);
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: row().id, authId: null },
      data: { authId: AUTH_ID },
    });
  });

  it("creates an account with the new-account roles after a fresh Microsoft sign-in", async () => {
    db.user.findUnique.mockResolvedValueOnce(null);
    db.user.create.mockResolvedValueOnce(row({ authId: AUTH_ID }));

    await userForSupabase(identity({ nameAfterSignIn: "Anna de Vries" }));

    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          authId: AUTH_ID,
          email: "anna@example.com",
          name: "Anna de Vries",
          roles: ["user"],
        },
      }),
    );
  });

  it("asks to sign in again before creating an account for an older session", async () => {
    db.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      userForSupabase(identity({ freshSignIn: false })),
    ).rejects.toMatchObject({ status: 403, code: "SIGN_IN_AGAIN" });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it.each([
    ["email", "email"],
    ["an unknown provider", "github"],
    ["no provider", null],
  ])(
    "refuses an unknown user who signed in with %s",
    async (_case, provider) => {
      db.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        userForSupabase(identity({ provider, viaMicrosoft: false })),
      ).rejects.toMatchObject({ status: 403, code: "NO_ACCESS" });
      expect(db.user.findMany).not.toHaveBeenCalled();
    },
  );

  it("refuses to link an account that belongs to another Supabase id", async () => {
    db.user.findUnique.mockResolvedValueOnce(null);
    db.user.findMany.mockResolvedValueOnce([row({ authId: "someone-else" })]);

    await expect(userForSupabase(identity())).rejects.toMatchObject({
      status: 409,
      code: "ALREADY_LINKED",
    });
  });

  it("refuses to link a deactivated account", async () => {
    db.user.findUnique.mockResolvedValueOnce(null);
    db.user.findMany.mockResolvedValueOnce([row({ active: false })]);

    await expect(userForSupabase(identity())).rejects.toMatchObject({
      status: 403,
    });
  });

  it("does not guess between two accounts with the same address", async () => {
    db.user.findUnique.mockResolvedValueOnce(null);
    db.user.findMany.mockResolvedValueOnce([
      row(),
      row({
        id: "22222222-2222-4222-8222-222222222222",
        email: "Anna@example.com",
      }),
    ]);

    await expect(userForSupabase(identity())).rejects.toMatchObject({
      status: 409,
      code: "DUPLICATE_ACCOUNT",
    });
  });

  it("updates the name right after a Microsoft sign-in", async () => {
    db.user.findUnique.mockResolvedValueOnce(row({ authId: AUTH_ID }));

    const user = await userForSupabase(
      identity({ nameAfterSignIn: "Anna van Dijk" }),
    );

    expect(user.name).toBe("Anna van Dijk");
  });

  it("looks up once more when two first requests collide", async () => {
    db.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(row({ authId: AUTH_ID }));
    db.user.create.mockRejectedValueOnce(uniqueViolation());

    const user = await userForSupabase(identity());

    expect(user.authId).toBe(AUTH_ID);
  });
});
