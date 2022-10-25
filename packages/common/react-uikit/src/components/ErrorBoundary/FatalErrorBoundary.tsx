//
// Copyright 2022 DXOS.org
//

import React, { Component, PropsWithChildren } from 'react';

import { FatalError } from './FatalError';

export interface ErrorBoundaryState {
  fatalError: Error | null;
}

export class FatalErrorBoundary extends Component<PropsWithChildren<{}>, ErrorBoundaryState> {
  override state = { fatalError: null };

  // Note: Render errors also trigger global onerror before componentDidCatch.
  override componentDidCatch(err: Error) {
    this.setState({ fatalError: err });
  }

  override render() {
    const { children } = this.props;
    const { fatalError } = this.state;

    return fatalError ? <FatalError error={fatalError} /> : children;
  }
}
