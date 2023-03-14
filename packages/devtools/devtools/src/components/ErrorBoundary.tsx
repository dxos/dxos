//
// Copyright 2023 DXOS.org
//

import { Clipboard } from '@phosphor-icons/react';
import React, { Component, PropsWithChildren, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { log } from '@dxos/log';
import { Tooltip } from '@dxos/react-appkit';
import { Alert, Button } from '@dxos/react-components';
import { captureException } from '@dxos/sentry';

const ErrorPopup = ({ error, onReset }: { error: Error; onReset?: () => void }) => {
  let insideRouter = false;
  try {
    insideRouter = !!useLocation().pathname;
  } catch (e) {
    log.info('ErrorBoundary is outside of Router.');
  }
  const navigate = insideRouter ? useNavigate() : undefined;

  const message = String(error);
  const stack = error.stack;

  const onCopyError = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify({ message, stack }));
  }, [message, stack]);

  return (
    <div className='m-4'>
      <Alert title={message} valence={'error'} slots={{ root: { className: 'mlb-4' } }}>
        <pre className='text-xs overflow-auto max-w-72 max-h-72 overflow-hidden'>{stack}</pre>
      </Alert>
      <div role='none' className='flex'>
        <Tooltip content='Copy' zIndex='z-[21]'>
          <Button onClick={onCopyError}>
            <Clipboard weight='duotone' size='1em' />
          </Button>
        </Tooltip>
        <div role='none' className='flex-grow' />
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
    return { hasError: true, error };
    captureException(error);
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
