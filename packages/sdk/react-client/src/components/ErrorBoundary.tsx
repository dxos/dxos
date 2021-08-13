//
// Copyright 2020 DXOS.org
//

import React, { Component, ErrorInfo } from 'react';

/**
 * Root-level error boundary.
 * https://reactjs.org/docs/error-boundaries.html
 *
 * NOTE: Must currently be a Component.
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */

interface ErrorComponentType {
  error: Error | null,
  onRestart?: () => void,
  onReset?: () => void,
}

type ErrorCallbackType = (error: Error, errorInfo?: ErrorInfo) => void;

interface Props {
  onError: ErrorCallbackType,
  onRestart?: () => void,
  onReset?: () => void,
  errorComponent?: React.ComponentType<ErrorComponentType>
}

interface State {
  error: Error | null
}

/**
 * https://reactjs.org/docs/error-boundaries.html
 */
class ErrorBoundary extends Component<Props, State> {
  override state = {
    error: null
  };

  static defaultProps = {
    onError: console.warn,
    onRestart: () => {
      window.location.href = '/';
    },
    onReset: undefined,
    errorComponent: undefined
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
    const { children, onRestart, onReset, errorComponent } = this.props;
    const { error } = this.state;

    if (error && errorComponent) {
      const ErrorComponent = errorComponent;
      return (<ErrorComponent onRestart={onRestart} onReset={onReset} error={error} />);
    }

    return children;
  }
}

export { ErrorBoundary, ErrorComponentType, ErrorCallbackType };
