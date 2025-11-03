//
// Copyright 2023 DXOS.org
//

import React, { Component, type FC, type PropsWithChildren, type ReactNode } from 'react';

type State = {
  error: Error | undefined;
};

export type ErrorBoundaryProps = PropsWithChildren<{
  data?: any;
  fallback?: FC<{ data?: any; error: Error }>;
}>;

/**
 * Surface error boundary.
 * For basic usage prefer providing a fallback component to `Surface`.
 *
 * Ref: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override state = { error: undefined };

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (prevProps.data !== this.props.data) {
      this.resetError();
    }
  }

  override render(): ReactNode {
    if (this.state.error) {
      const Fallback = this.props.fallback ?? DefaultFallback;
      return <Fallback data={this.props.data} error={this.state.error} />;
    }

    return this.props.children;
  }

  private resetError(): void {
    this.setState({ error: undefined });
  }
}

const DefaultFallback: NonNullable<ErrorBoundaryProps['fallback']> = ({ data, error }) => (
  <div className='flex flex-col gap-2 overflow-hidden border border-red-500 rounded-sm'>
    <h1 className='p-2'>ERROR: {error.message}</h1>
    <pre className='p-2 overflow-y-auto text-sm text-subdued'>{JSON.stringify(data, null, 2)}</pre>
  </div>
);
