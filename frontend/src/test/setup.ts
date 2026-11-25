import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without `globals: true` Testing Library does not clean up by itself: renders
// pile up and a second test finds "multiple elements".
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

// jsdom has no matchMedia; AppShell uses it to pick its mobile layout. Tests
// render the desktop layout.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
