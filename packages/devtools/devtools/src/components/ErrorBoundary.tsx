//
// Copyright 2023 DXOS.org
//

import React, { Component, type PropsWithChildren, type ReactNode } from 'react';
// import { useNavigate } from 'react-router-dom';

// import { Button, Message } from '@dxos/react-ui';
import { captureException } from '@dxos/observability/sentry';

const ErrorPopup = ({ error, onReset }: { error: Error; onReset?: () => void }) => {
  return <div>{error.message}</div>;

  // const navigate = useNavigate();
  // const message = String(error);
  // const stack = error.stack;

  // const handleCopyError = useCallback(() => {
  //   void navigator.clipboard.writeText(JSON.stringify({ message, stack }));
  // }, [message, stack]);

  // return (
  //   <div className='m-4'>
  //     <Message.Root valence='error' className='mlb-4'>
  //       <Message.Title>{message}</Message.Title>
  //       <pre className='text-xs overflow-auto max-is-72 max-bs-72'>{stack}</pre>
  //     </Message.Root>
  //     <div role='none' className='flex gap-2'>
  //       <div className='grow' />
  //       <Button onClick={handleCopyError} classNames='gap-2'>
  //         <span>Copy Error</span>
  //         <Clipboard weight='duotone' />
  //       </Button>
  //       <Button
  //         variant='primary'
  //         onClick={async () => {
  //           navigate?.('/');
  //           onReset?.();
  //         }}
  //       >
  //         <span>Reset</span>
  //       </Button>
  //     </div>
  //   </div>
  // );
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

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    captureException(error);
    return { hasError: true, error };
  }

  override render(): ReactNode {
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
