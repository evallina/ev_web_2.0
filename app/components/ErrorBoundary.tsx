'use client';

import React from 'react';

interface State { hasError: boolean }

// Catches render errors in the subtree so a crash doesn't take down the whole page.
// Usage: <ErrorBoundary fallback={<p>Something went wrong</p>}><Component /></ErrorBoundary>
export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
