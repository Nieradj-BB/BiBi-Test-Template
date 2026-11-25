import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppRoutes } from "@/App";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoleRoute } from "@/components/layout/RoleRoute";
import { AuthProvider } from "@/context/AuthContext";
import { api } from "@/services/api";
import { createQueryClient } from "@/services/queryClient";
import { supabaseFake } from "@/test/supabaseFake";
import type { User } from "@/types/user";

vi.mock("@/services/supabase", async () => ({
  supabase: (await import("@/test/supabaseFake")).supabaseFake.supabase,
}));
vi.mock("@/services/api", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const USER: User = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  email: "user@bb-template.test",
  name: "Test Gebruiker",
  roles: ["user"],
};

function httpError(status: number, data: unknown = {}): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("fail", "ERR_BAD_REQUEST", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data,
  });
}

function withProviders(path: string, routes: ReactNode) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

const renderApp = (path: string) => withProviders(path, <AppRoutes />);

beforeEach(() => {
  supabaseFake.reset();
  vi.mocked(api.get).mockReset();
  vi.mocked(api.post).mockReset();
});

describe("sign-in page", () => {
  it("shows the wordmark to a signed-out visitor, without the app shell", async () => {
    vi.mocked(api.get).mockRejectedValue(httpError(401));

    renderApp("/");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Blue Bricks Template",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Inloggen met Microsoft" }),
    ).toBeEnabled();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows the backend's message when access is refused", async () => {
    vi.mocked(api.get).mockRejectedValue(
      httpError(403, {
        error: { code: "NO_ACCESS", message: "Je account heeft geen toegang." },
      }),
    );

    renderApp("/login");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Je account heeft geen toegang.",
    );
  });

  it("lets a refused user sign in with another account", async () => {
    vi.mocked(api.get).mockRejectedValue(
      httpError(403, {
        error: { code: "FORBIDDEN", message: "Dit account is gedeactiveerd" },
      }),
    );
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    renderApp("/login");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Inloggen met een ander account",
      }),
    );

    await waitFor(() =>
      expect(supabaseFake.supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            queryParams: { prompt: "select_account" },
          }),
        }),
      ),
    );
    expect(supabaseFake.supabase.auth.signOut).toHaveBeenCalledOnce();
  });

  it("offers a retry instead of the sign-in page during an outage", async () => {
    vi.mocked(api.get).mockRejectedValue(httpError(400));

    renderApp("/");

    expect(
      await screen.findByRole("button", { name: "Opnieuw proberen" }),
    ).toBeInTheDocument();
  });

  it("returns to the requested page after the dev login", async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(httpError(401))
      .mockResolvedValue({ data: { data: USER } });
    vi.mocked(api.post).mockResolvedValue({ data: { data: USER } });

    renderApp("/does-not-exist");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Direct inloggen als Gebruiker",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Pagina niet gevonden",
      }),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/auth/dev-login", { role: "user" });
  });

  it("remembers the requested page for the Microsoft round trip", async () => {
    vi.mocked(api.get).mockRejectedValue(httpError(401));

    renderApp("/projects?tab=open");
    await userEvent.click(
      await screen.findByRole("button", { name: "Inloggen met Microsoft" }),
    );

    expect(window.sessionStorage.getItem("returnPath")).toBe(
      "/projects?tab=open",
    );
    expect(supabaseFake.supabase.auth.signInWithOAuth).toHaveBeenCalledOnce();
  });
});

describe("app shell and start page", () => {
  it("shows the start page inside the shell", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: USER } });

    renderApp("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Welkom, Test" }),
    ).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Hoofdmenu" });
    expect(within(nav).getByRole("link", { name: "Start" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Test Gebruiker")).toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("shows the not-found page for an unknown path, with a way back", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: USER } });

    renderApp("/does-not-exist");
    await userEvent.click(
      await screen.findByRole("link", { name: "Naar de startpagina" }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Welkom, Test" }),
    ).toBeInTheDocument();
  });

  it("shows a crashed page inside the shell, and the menu still works", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: USER } });
    // React logs the caught error; keep the test output clean.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    function Broken(): never {
      throw new Error("broken");
    }

    withProviders(
      "/broken",
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<p>Startpagina</p>} />
          <Route path="broken" element={<Broken />} />
        </Route>
      </Routes>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Er ging iets mis",
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(screen.getByRole("navigation", { name: "Hoofdmenu" })).getByRole(
        "link",
        { name: "Start" },
      ),
    );
    expect(await screen.findByText("Startpagina")).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("signs out from the shell and returns to the sign-in page", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: USER } });
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    renderApp("/");
    await userEvent.click(
      await screen.findByRole("button", { name: "Uitloggen" }),
    );

    expect(
      await screen.findByRole("button", { name: "Inloggen met Microsoft" }),
    ).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/auth/dev-logout");
  });
});

describe("RoleRoute", () => {
  it("sends a user without the role to the start page", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: USER } });

    withProviders(
      "/admin",
      <Routes>
        <Route path="/" element={<p>Startpagina</p>} />
        <Route
          path="/admin"
          element={
            <RoleRoute role="admin">
              <p>Beheerpagina</p>
            </RoleRoute>
          }
        />
      </Routes>,
    );

    expect(await screen.findByText("Startpagina")).toBeInTheDocument();
    expect(screen.queryByText("Beheerpagina")).not.toBeInTheDocument();
  });
});
