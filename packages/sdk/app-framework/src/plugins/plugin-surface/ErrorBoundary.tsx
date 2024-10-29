//
// Copyright 2023 DXOS.org
//

import React, { Component, type FC, type PropsWithChildren } from 'react';

type Props = PropsWithChildren<{ data?: any; fallback: FC<{ data?: any; error: Error; reset: () => void }> }>;
type State = { error: Error | undefined };

/**
 * Surface error boundary.
 *
 * For basic usage prefer providing a fallback component to `Surface`.
 *
 * For more information on error boundaries, see:
 * https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidUpdate(prevProps: Props): void {
    if (prevProps.data !== this.props.data) {
      this.resetError();
    }
  }

  override render() {
    if (this.state.error) {
      return <this.props.fallback data={this.props.data} error={this.state.error} reset={this.resetError} />;
    }

    return this.props.children;
  }

  private resetError() {
    this.setState({ error: undefined });
  }
}
