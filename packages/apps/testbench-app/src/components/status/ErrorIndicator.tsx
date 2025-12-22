//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { styles } from './styles';

// TODO(burdon): Reconcile with DebugPlugin.
export const ErrorIndicator = () => {
  const [, forceUpdate] = useState({});
  const errorRef = useRef<Error>(null);
  useEffect(() => {
    const errorListener = (event: any) => {
      const error: Error = event.error ?? event.reason;
      // event.preventDefault();
      if (errorRef.current !== error) {
        errorRef.current = error;
        forceUpdate({});
      }
    };

    // TODO(burdon): Register globally?
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event
    window.addEventListener('error', errorListener);

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
    window.addEventListener('unhandledrejection', errorListener);

    return () => {
      window.removeEventListener('error', errorListener);
      window.removeEventListener('unhandledrejection', errorListener);
    };
  }, []);

  return (
    <IconButton
      classNames={mx(errorRef.current ? styles.error : styles.default)}
      icon='ph--circle--fill'
      iconOnly
      label={errorRef.current?.message ?? 'No errors.'}
      onClick={() => {
        errorRef.current = null;
        forceUpdate({});
      }}
      size={3}
      variant='ghost'
    />
  );
};
