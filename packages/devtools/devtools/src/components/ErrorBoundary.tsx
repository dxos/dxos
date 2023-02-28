//
// Copyright 2023 DXOS.org
//

import React, { Component, PropsWithChildren } from 'react';

export class ErrorBoundary extends Component<PropsWithChildren<{}>, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <div>Runtime Error</div>;
    }

    return this.props.children;
  }
}
