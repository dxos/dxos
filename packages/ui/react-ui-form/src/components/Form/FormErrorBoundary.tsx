//
// Copyright 2025 DXOS.org
//

import React, { Component, type PropsWithChildren, type ReactNode } from 'react';

type FormErrorState = {
  error: Error | undefined;
};

type FormErrorBoundaryProps = PropsWithChildren<{
  path?: (string | number)[];
}>;

export class FormErrorBoundary extends Component<FormErrorBoundaryProps, FormErrorState> {
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override state = { error: undefined };

  override componentDidUpdate(prevProps: FormErrorBoundaryProps): void {
    if (prevProps.path !== this.props.path) {
      this.resetError();
    }
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className='flex gap-2 border border-roseFill font-mono text-sm'>
          <span className='bg-roseFill text-surfaceText pli-1 font-thin'>ERROR</span>
          {String(this.props.path?.join('.'))}
        </div>
      );
    }

    return this.props.children;
  }

  private resetError(): void {
    this.setState({ error: undefined });
  }
}
