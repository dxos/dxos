//
// Copyright 2024 DXOS.org
//

import { Circle, type IconProps } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { getSize, mx } from '@dxos/react-ui-theme';

import { styles } from './styles';

// TODO(burdon): Reconcile with DebugPlugin.
export const ErrorIndicator = (props: IconProps) => {
  const [, forceUpdate] = useState({});
  const errorRef = useRef<Error>();
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
    <span
      title={errorRef.current?.message ?? 'No errors.'}
      onClick={() => {
        errorRef.current = undefined;
        forceUpdate({});
      }}
    >
      <Circle weight='fill' className={mx(errorRef.current ? styles.error : styles.default, getSize(3))} {...props} />
    </span>
  );
};
