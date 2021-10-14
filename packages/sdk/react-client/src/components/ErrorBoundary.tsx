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

export interface ErrorComponentProps {
  error: Error | null,
  onRestart?: () => void,
  onReset?: () => void,
}

export type ErrorCallbackType = (error: Error, errorInfo?: ErrorInfo) => void;

interface Props {
  onError: ErrorCallbackType,
  onRestart?: () => void,
  onReset?: () => void,
  errorComponent?: React.ComponentType<ErrorComponentProps>
}

interface State {
  error: Error | null
}

/**
 * https://reactjs.org/docs/error-boundaries.html
 */
export class ErrorBoundary extends Component<Props, State> {
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

      log(`ErrorComponent not set [${String(error)}]`);
      return null;
    }

    return children;
  }
}
