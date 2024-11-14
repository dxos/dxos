//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type LayoutCoordinate } from '@dxos/app-framework';
import { type Node } from '@dxos/plugin-graph';
import { useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { NodePlankHeading } from './NodePlankHeading';
import { PlankLoading } from './PlankLoading';
import { DECK_PLUGIN } from '../../meta';

export const PlankContentError = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(DECK_PLUGIN);
  const errorString = error?.toString() ?? '';
  return (
    <div role='none' className='overflow-auto p-8 attention-surface grid place-items-center'>
      <p
        role='alert'
        className={mx(
          descriptionText,
          'break-words border border-dashed border-separator rounded-lg p-8',
          errorString.length < 256 && 'text-lg',
        )}
      >
        {error ? errorString : t('error fallback message')}
      </p>
    </div>
  );
};

export const PlankError = ({
  layoutCoordinate,
  node,
  error,
}: {
  layoutCoordinate: LayoutCoordinate;
  node?: Node;
  error?: Error;
}) => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimeout(() => setTimedOut(true), 5e3);
  }, []);
  return (
    <>
      <NodePlankHeading coordinate={layoutCoordinate} node={node} pending={!timedOut} />
      {timedOut ? <PlankContentError error={error} /> : <PlankLoading />}
    </>
  );
};
