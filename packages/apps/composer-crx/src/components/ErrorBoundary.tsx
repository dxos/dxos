//
// Copyright 2025 DXOS.org
//

import React, { Component, type PropsWithChildren, type ReactNode } from 'react';

/**
 * Error boundary.
 * https://reactjs.org/docs/error-boundaries.html
 */
export class ErrorBoundary extends Component<
  PropsWithChildren<{}>,
  { error: Error; hasError: true } | { hasError: false }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return <div className='min-is-[300px] p-2 text-rose-500'>{this.state.error.message}</div>;
    }

    return this.props.children;
  }
}
