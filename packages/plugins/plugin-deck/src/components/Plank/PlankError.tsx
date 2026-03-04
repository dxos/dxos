//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type Node } from '@dxos/plugin-graph';
import { type FallbackProps } from '@dxos/react-error-boundary';
import { ErrorFallback, useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

import { PlankHeading, type PlankHeadingProps } from './PlankHeading';
import { PlankLoading } from './PlankLoading';

export const PlankError = ({
  id,
  part,
  node,
  error,
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
export const PlankErrorFallback = ({ error }: FallbackProps) => {
  const { t } = useTranslation(meta.id);

  if (process.env.NODE_ENV === 'development') {
    return <ErrorFallback title='Plank Error' error={error} />;
  } else {
    const errorString = error?.toString() ?? '';
    return (
      <div
        role='none'
        data-testid='plank-content-error'
        className='dx-attention-surface overflow-y-auto p-8 grid place-items-center'
      >
        <p role='alert' className={mx(descriptionMessage, 'break-all rounded-md p-4')}>
          {error ? errorString : t('error fallback message')}
        </p>
      </div>
    );
  }
};
