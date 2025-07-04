//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type Node } from '@dxos/plugin-graph';
import { useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';

import { PlankHeading, type PlankHeadingProps } from './PlankHeading';
import { PlankLoading } from './PlankLoading';
import { DECK_PLUGIN } from '../../meta';

export const PlankContentError = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(DECK_PLUGIN);
  const errorString = error?.toString() ?? '';
  return (
    <div role='none' className='overflow-auto p-8 attention-surface grid place-items-center'>
      <p
        role='alert'
        className={mx(descriptionMessage, 'break-words rounded-md p-8', errorString.length < 256 && 'text-lg')}
      >
        {error ? errorString : t('error fallback message')}
      </p>
    </div>
  );
};

export const PlankError = ({
  id,
  part,
  node,
  error,
}: {
  id: string;
  part: PlankHeadingProps['part'];
  node?: Node;
  error?: Error;
}) => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimeout(() => setTimedOut(true), 5e3);
  }, []);
  return (
    <>
      <PlankHeading id={id} part={part} node={node} pending={!timedOut} />
      {timedOut ? <PlankContentError error={error} /> : <PlankLoading />}
    </>
  );
};
