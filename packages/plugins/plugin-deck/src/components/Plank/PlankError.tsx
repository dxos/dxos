//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type Node } from '@dxos/plugin-graph';
import { useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

import { PlankHeading, type PlankHeadingProps } from './PlankHeading';
import { PlankLoading } from './PlankLoading';

export const PlankContentError = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(meta.id);
  const errorString = error?.toString() ?? '';
  return (
    <div role='none' className='overflow-y-auto p-8 attention-surface grid place-items-center'>
      <p role='alert' className={mx(descriptionMessage, 'break-all rounded-md p-4')}>
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
  node?: Node.Node;
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
