//
// Copyright 2023 DXOS.org
//

import React, { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

interface State {
  error: Error | null;
}

const SimpleFallback = ({ error }: { error: Error }) => <div>Error: {error.message}</div>;

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    const { children } = this.props;
    const { error } = this.state;

    if (error) {
      return <SimpleFallback error={error} />;
    }

    return children;
  }
}
