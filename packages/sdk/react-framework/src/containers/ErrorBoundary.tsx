//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { Component, ErrorInfo, ReactNode, useContext, useEffect } from 'react';

import { ErrorIndicator, ErrorIndicatorProps, ErrorView, ErrorViewProps } from '../components';
import { ErrorContext } from '../hooks';

const error = debug('dxos:react-framework:error');

// TODO(burdon): Override if dev-only?
const logError = (f: string, ...args: any[]) => error.enabled ? error(f, ...args) : console.error(f, ...args);

/**
 * Wrapper for global error handling.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
 */
const GlobalErrorWrapper = ({
  children,
  indicator: ErrorIndicator
}: {
  children: ReactNode,
  indicator?: React.FC<ErrorIndicatorProps> | null
}) => {
  const { errors, addError, resetErrors } = useContext(ErrorContext)!;

  // Register global error handlers.
  // TODO(burdon): Post errors to monitoring service.
  useEffect(() => {
    window.onerror = (message, source, lineno, colno, error?: Error) => {
      logError('onerror', message);
      addError(error!);
      return true; // Prevent default.
    };

    const listener = (event: any) => {
      logError('unhandledrejection', event.reason);
      addError(event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', listener);
    return () => {
      window.removeEventListener('unhandledrejection', listener as any);
    };
  }, []);

  return (
    <>
      {children}
      {ErrorIndicator && (
        <ErrorIndicator
          errors={errors}
          onReset={resetErrors}
        />
      )}
    </>
  );
};

// TODO(burdon): Configure error indicator.
// TODO(burdon): Configure loading indicator (that can be reset downstream).

interface ErrorBoundaryProps {
  indicator?: React.FC<ErrorIndicatorProps> | null
  view: React.FC<ErrorViewProps>
  onError: (error: Error, errorInfo: ErrorInfo) => void
  onReload?: () => void
  onReset?: () => void
}

interface ErrorBoundaryState {
  error: Error | undefined
  errors: Error[]
}

/**
 * Root-level error boundary.
 * NOTE: Must currently be a Component.
 * https://reactjs.org/docs/error-boundaries.html
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps = {
    indicator: ErrorIndicator, // TODO(burdon): Debug only.
    view: ErrorView,
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
    const { children, onReload, onReset, indicator, view: View } = this.props;
    const { error, errors } = this.state;

    const addError = (error: Error) => {
      this.setState({
        errors: [error, ...errors]
      });
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
        <GlobalErrorWrapper indicator={indicator}>
          {children}
        </GlobalErrorWrapper>
      </ErrorContext.Provider>
    );
  }
}
