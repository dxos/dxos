//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { TimeoutError } from '@dxos/errors';
import { log } from '@dxos/log';
import { type Node } from '@dxos/plugin-graph';
import { ErrorFallback, type ErrorFallbackProps, useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

import { PlankHeading, type PlankHeadingProps } from './PlankHeading';
import { PlankLoading } from './PlankLoading';

export const PlankError = ({
  id,
  part,
  node,
  error: errorProp,
}: {
  id: string;
  part: PlankHeadingProps['part'];
  node?: Node.Node;
  error?: Error;
}) => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5_000);
    return () => clearTimeout(timer);
  }, []);

  const error = useMemo(() => {
    if (timedOut) {
      return new TimeoutError({ message: 'Timeout loading content' });
    }

    return errorProp;
  }, [timedOut, errorProp]);

  return (
    <>
      <PlankHeading id={id} part={part} node={node} pending={!timedOut} />
      {timedOut ? <PlankErrorFallback error={error} /> : <PlankLoading />}
    </>
  );
};

/**
 * User facing error fallback.
 */
export const PlankErrorFallback = ({ error }: ErrorFallbackProps) => {
  const { t } = useTranslation(meta.id);

  useEffect(() => {
    if (error) {
      log.error(error);
    }
  }, [error]);

  if (process.env.NODE_ENV === 'development') {
    return <ErrorFallback title='Plank Error' error={error} />;
  } else {
    const errorString = error?.toString() ?? '';
    return (
      <div
        role='alert'
        data-testid='plank-content-error'
        className='dx-attention-surface overflow-y-auto p-8 grid place-items-center'
      >
        <p className={mx(descriptionMessage, 'break-all rounded-md p-4')}>
          {error ? errorString : t('error fallback message')}
        </p>
      </div>
    );
  }
};
