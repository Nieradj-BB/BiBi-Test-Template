import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  /** Shown instead of the children after a render error. */
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Catches a render error below it and shows `fallback` instead of a blank
 * screen; React logs the error itself. A class, because React offers error
 * boundaries only as classes. Give it a `key` that changes on navigation, so
 * the next page starts fresh.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
