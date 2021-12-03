//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { Component, ErrorInfo } from 'react';

import { ErrorIndicator, ErrorView, ErrorViewProps } from '../components';
import { ErrorContext } from '../hooks';

const logError = debug('dxos:react-framework:error');

/**
 * Root-level error boundary.
 * https://reactjs.org/docs/error-boundaries.html
 *
 * NOTE: Must currently be a Component.
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */

// TODO(burdon): Remove Framework context and set error context here.
// TODO(burdon): Add configurable error indicator.
// TODO(burdon): Add Loading indicator (that can be reset downstream).

interface Props {
  view: React.FC<ErrorViewProps>
  indicator: React.FC<ErrorViewProps>
  onError: (error: Error, errorInfo: ErrorInfo) => void
  onReload?: () => void
  onReset?: () => void
}

interface State {
  error: Error | undefined
  errors: Error[]
}

/**
 * Cannot be implemented via hooks.
 * https://reactjs.org/docs/error-boundaries.html
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */
// TODO(burdon): Integrate with useError hook?
//   https://github.com/tatethurston/react-use-error-boundary/blob/main/src/test.tsx
export class ErrorBoundary extends Component<Props, State> {
  static defaultProps = {
    view: ErrorView,
    indicator: undefined,
    onError: logError,
    onReload: undefined,
    onReset: undefined
  };

  /**
   * https://reactjs.org/docs/react-component.html#static-getderivedstatefromerror
   */
  static getDerivedStateFromError (error: Error) {
    return { error };
  }

  override state = {
    error: undefined, // Error during child rendering.
    errors: [] // All runtime errors.
  };

  override componentDidCatch (error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errors } = this.state;

    onError(error, errorInfo);
    this.setState({ errors: [error, ...errors] });
  }

  override render () {
    const { children, onReload, onReset, view: View } = this.props;
    const { error, errors } = this.state;

    const addError = (error: Error) => {
      this.setState({
        errors: [error, ...errors]
      })
    };

    const resetErrors = () => {
      this.setState({ errors: [] });
    };

    if (error) {
      return (
        <View
          error={error}
          onReload={onReload}
          onReset={onReset}
        />
      );
    }

    return (
      <ErrorContext.Provider value={{ errors, addError, resetErrors }}>
        {children}
        <ErrorIndicator errors={errors} onReset={resetErrors} />
      </ErrorContext.Provider>
    );
  }
}
