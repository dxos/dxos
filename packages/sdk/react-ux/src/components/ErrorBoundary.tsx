//
// Copyright 2020 DXOS.org
//

import React, { Component, ErrorInfo } from 'react';

import ErrorView from './ErrorView';

/**
 * Root-level error boundary.
 * https://reactjs.org/docs/error-boundaries.html
 *
 * NOTE: Must currently be a Component.
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */

interface Props {
  onError: (error: Error, errorInfo: ErrorInfo) => void,
  onRestart?: () => void,
  onReset?: () => void
}

interface State {
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  override state = {
    error: null
  };

  static defaultProps = {
    onError: console.warn,
    onRestart: () => {
      window.location.href = '/';
    },
    onReset: undefined
  };

  static getDerivedStateFromError (error: any) {
    return { error };
  }

  override componentDidCatch (error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;

    // TODO(burdon): Show error indicator.
    // TODO(burdon): Logging service; output error file to storage?
    onError(error, errorInfo);
  }

  override render () {
    const { children, onRestart, onReset } = this.props;
    const { error } = this.state;

    if (error) {
      return <ErrorView onRestart={onRestart} onReset={onReset} error={error} />;
    }

    return children;
  }
}

export default ErrorBoundary;
