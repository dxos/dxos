//
// Copyright 2020 DXOS.org
//

import React, { Component, FunctionComponent, PropsWithChildren } from 'react';

import {
  ErrorIndicator,
  ErrorIndicatorProps,
  ErrorView,
  ErrorViewProps
} from '../../components';
import { ErrorContext } from '../../hooks';
import { GlobalErrorWrapper } from './GlobalErrorWrapper';

// TODO(burdon): Configure error indicator.
// TODO(burdon): Configure loading indicator (that can be reset downstream).

interface ErrorBoundaryProps {
  indicator?: FunctionComponent<ErrorIndicatorProps> | null;
  view: FunctionComponent<ErrorViewProps>;
  onError: (error: Error) => boolean;
  onReload?: () => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  errors: Error[];
  fatal: boolean;
}

/**
 * Root-level error boundary.
 * NOTE: Must currently be a Component.
 * https://reactjs.org/docs/error-boundaries.html
 * https://reactjs.org/docs/hooks-faq.html#do-hooks-cover-all-use-cases-for-classes
 */
export class ErrorBoundary extends Component<
  PropsWithChildren<ErrorBoundaryProps>,
  ErrorBoundaryState
> {
  static defaultProps = {
    indicator: ErrorIndicator, // TODO(burdon): Debug only.
    view: ErrorView,
    onError: undefined,
    onReload: undefined,
    onReset: undefined
  };

  override state = {
    errors: [], // All runtime errors.
    fatal: false // Whether the head error is fatal or not.
  };

  // NOTE: Render errors also trigger global onerror before componentDidCatch.
  override componentDidCatch(err: Error) {
    const { errors } = this.state;

    this.setState({ errors: [err, ...errors], fatal: true });
  }

  override render() {
    const { children, onReload, onReset, indicator, view: View } = this.props;
    const { errors, fatal } = this.state;

    const addError = (error: Error) => {
      const { onError } = this.props;

      const fatal = onError?.(error) ?? false;
      this.setState({ errors: [error, ...errors], fatal });
    };

    const resetErrors = () => {
      this.setState({ errors: [] });
    };

    if (fatal) {
      return <View error={errors[0]} onReload={onReload} onReset={onReset} />;
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
