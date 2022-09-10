//
// Copyright 2020 DXOS.org
//

import React, { Component, PropsWithChildren } from 'react';

interface ErrorBoundaryState {
  hasError: boolean
  error?: any
}

// NOTE: Has to be Component, not arrow function.
export class ErrorBoundary extends Component<PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor (props: {}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError (error: any) {
    return { hasError: true, error };
  }

  override componentDidCatch (err: any, info: any) {
    console.error(err, info);
  }

  override render () {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', background: 'white' }}>
          <h1>Something went wrong.</h1>
          <div style={{ whiteSpace: 'pre', fontFamily: 'monospace' }}>
            {this.state.error?.stack ?? this.state.error?.message ?? String(this.state.error)}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
