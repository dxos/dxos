//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { Component, ErrorInfo } from 'react';

const log = debug('dxos:react-client:error');

/**
 * Root-level error boundary.
 * https://reactjs.org/docs/error-boundaries.html
 *
 * NOTE: Must currently be a Component.
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */

export type ErrorCallbackType = (error: Error, errorInfo?: ErrorInfo) => void;

export interface ErrorComponentProps {
  error: Error | null,
  onRestart?: () => void,
  onReset?: () => void,
}

interface ErrorBoundaryProps {
  onError: ErrorCallbackType,
  onRestart?: () => void,
  onReset?: () => void,
  errorComponent?: React.ComponentType<ErrorComponentProps>
}

interface State {
  error: Error | null
}

/**
 * Top-level error boundary.
 * NOTE: Doesn't catch exceptions in event handlers, or asynchronous callbacks.
 * A global error handler should be configured for such errors.
 * https://reactjs.org/docs/error-boundaries.html#how-about-event-handlers
 * https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
 * It DOES catch exceptions in hooks and any components that return malformed React compoennts.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
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
    onError(error, errorInfo);
  }

  override render () {
    const { children, onRestart, onReset, errorComponent: ErrorComponent } = this.props;
    const { error } = this.state;

    if (error) {
      if (ErrorComponent) {
        return (
          <ErrorComponent
            onRestart={onRestart}
            onReset={onReset}
            error={error}
          />
        );
      }

      log('ErrorComponent not set.');
      return (
        <div style={{ border: '1px solid #CCC', padding: 16 }}>
          <h1>ErrorBoundary component not set.</h1>
          <pre style={{ whiteSpace: 'break-spaces' }}>
            {String(error)}
          </pre>
        </div>
      );
    }

    return children;
  }
}
