//
// Copyright 2023 DXOS.org
//

import { Clipboard } from '@phosphor-icons/react';
import React, { Component, PropsWithChildren, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Message } from '@dxos/aurora';
import { captureException } from '@dxos/sentry';

const ErrorPopup = ({ error, onReset }: { error: Error; onReset?: () => void }) => {
  return <div>{error.message}</div>;

  const navigate = useNavigate();
  const message = String(error);
  const stack = error.stack;

  const handleCopyError = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify({ message, stack }));
  }, [message, stack]);

  return (
    <div className='m-4'>
      <Message.Root valence='error' className='mlb-4'>
        <Message.Title>{message}</Message.Title>
        <pre className='text-xs overflow-auto max-w-72 max-h-72'>{stack}</pre>
      </Message.Root>
      <div role='none' className='flex gap-2'>
        <div className='grow' />
        <Button onClick={handleCopyError} classNames='gap-2'>
          <span>Copy Error</span>
          <Clipboard weight='duotone' />
        </Button>
        <Button
          variant='primary'
          onClick={async () => {
            navigate?.('/');
            onReset?.();
          }}
        >
          <span>Reset</span>
        </Button>
      </div>
    </div>
  );
};

/**
 * Error boundary.
 * https://reactjs.org/docs/error-boundaries.html
 */
export class ErrorBoundary extends Component<
  PropsWithChildren<{}>,
  { error: Error; hasError: true } | { hasError: false }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    captureException(error);
    return { hasError: true, error };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorPopup
          error={this.state.error}
          onReset={() => {
            this.setState({ hasError: false });
          }}
        />
      );
    }

    return this.props.children;
  }
}
