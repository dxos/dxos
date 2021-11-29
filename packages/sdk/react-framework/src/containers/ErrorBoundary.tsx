//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { Component, ErrorInfo } from 'react';

import { ErrorView } from '../components';

const logError = debug('dxos:react-framework:error');

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

/**
 * Cannot be implemented via hooks.
 * https://reactjs.org/docs/error-boundaries.html
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */
// TODO(burdon): Integrate with useError hook?
//   https://github.com/tatethurston/react-use-error-boundary/blob/main/src/test.tsx
export class ErrorBoundary extends Component<Props, State> {
  override state = {
    error: null
  };

  static defaultProps = {
    onError: logError,
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
    onError(error, errorInfo);
  }

  override render () {
    const { children, onRestart, onReset } = this.props;
    const { error } = this.state;

    // TODO(burdon): Customize view?
    if (error) {
      return (
        <ErrorView
          error={error}
          onRestart={onRestart}
          onReset={onReset}
        />
      );
    }

    return children;
  }
}
