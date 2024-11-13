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
  return (
    <div role='none' className='grid place-items-center row-span-2'>
      <p
        role='alert'
        className={mx(
          descriptionText,
          // TODO(burdon): Factor out common styles for all dialogs.
          'overflow-hidden break-words',
          'place-self-center border border-dashed border-neutral-400/50 rounded-lg text-center p-8 font-normal text-lg',
        )}
      >
        {error ? error.toString() : t('error fallback message')}
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
