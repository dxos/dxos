//
// Copyright 2020 DXOS.org
//

import React, { Component } from 'react';

interface ErrorBoundaryState {
  hasError: boolean
  error?: any
}

export class ErrorBoundary extends Component<{}, ErrorBoundaryState> {
  constructor (props: {}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError (error: any) {
    return { hasError: true, error };
  }

  override componentDidCatch (error: any, errorInfo: any) {
    console.error(error, errorInfo);
  }

  override render () {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', background: 'white' }}>
          <h1>Something went wrong.</h1>
          <p style={{ whiteSpace: 'pre', fontFamily: 'monospace' }}>
            {this.state.error?.stack ?? this.state.error?.message ?? String(this.state.error)}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
