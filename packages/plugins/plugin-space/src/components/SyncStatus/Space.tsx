//
// Copyright 2024 DXOS.org
//

import React, { type HTMLAttributes, useEffect, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { type SpaceId, useSpace } from '@dxos/react-client/echo';
import { Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type Progress, type PeerSyncState } from './sync-state';
import { SPACE_PLUGIN } from '../../meta';
import { getSpaceDisplayName } from '../../util';

export const SYNC_STALLED_TIMEOUT = 5_000;

// TODO(wittjosiah): Define sematic color tokens.
const styles = {
  barBg: 'bg-neutral-50 dark:bg-green-900 text-black',
  barFg: 'bg-neutral-100 bg-green-500',
  barHover: 'dark:hover:bg-green-500',
};

const useActive = (count: number) => {
  const [current, setCurrent] = useState(count);
  const [active, setActive] = useState(false);
  useEffect(() => {
    let t: NodeJS.Timeout | undefined;
    if (count !== current) {
      setActive(true);
      setCurrent(count);
      t && clearTimeout(t);
      t = setTimeout(() => {
        setActive(false);
      }, SYNC_STALLED_TIMEOUT);
    }

    return () => {
      setActive(false);
      clearTimeout(t);
    };
  }, [count, current]);
  return active;
};

export type SpaceRowContainerProps = Omit<SpaceRowProps, 'spaceName'>;

export const SpaceRowContainer = ({ spaceId, state }: SpaceRowContainerProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const space = useSpace(spaceId);
  if (!space) {
    return null;
  }

  const spaceName = toLocalizedString(getSpaceDisplayName(space, { personal: space === client.spaces.default }), t);

  return <SpaceRow spaceId={spaceId} spaceName={spaceName} state={state} />;
};

export type SpaceRowProps = {
  spaceId: SpaceId;
  spaceName: string;
  state: PeerSyncState;
};

export const SpaceRow = ({
  spaceId,
  spaceName,
  state: { localDocumentCount, remoteDocumentCount, missingOnLocal, missingOnRemote },
}: SpaceRowProps) => {
  const downActive = useActive(localDocumentCount);
  const upActive = useActive(remoteDocumentCount);

  return (
    <div
      className='flex items-center mx-[2px] gap-[2px] cursor-pointer'
      title={spaceId}
      onClick={() => {
        void navigator.clipboard.writeText(spaceId);
      }}
    >
      <span className='w-[50%] truncate'>{spaceName}</span>
      <Icon
        icon='ph--arrow-fat-line-left--regular'
        size={3}
        classNames={mx(downActive && 'animate-[pulse_1s_infinite]')}
      />
      <Candle
        up={{ count: remoteDocumentCount, total: remoteDocumentCount + missingOnRemote }}
        down={{ count: localDocumentCount, total: localDocumentCount + missingOnLocal }}
        title={spaceId}
      />
      <Icon
        icon='ph--arrow-fat-line-right--regular'
        size={3}
        classNames={mx(upActive && 'animate-[pulse_1s_step-start_infinite]')}
      />
    </div>
  );
};

type CandleProps = ThemedClassName<Pick<HTMLAttributes<HTMLDivElement>, 'title'>> & { up: Progress; down: Progress };

const Candle = ({ classNames, up, down }: CandleProps) => {
  return (
    <div className={mx('grid grid-cols-[1fr_2rem_1fr] w-full h-3', classNames)}>
      <Bar classNames='justify-end' {...up} />
      <div className='relative'>
        <div className={mx('absolute inset-0 flex items-center justify-center text-xs', styles.barBg)}>{up.total}</div>
      </div>
      <Bar {...down} />
    </div>
  );
};

const Bar = ({ classNames, count, total }: ThemedClassName<Progress>) => {
  let p = (count / total) * 100;
  if (count < total) {
    p = Math.min(p, 95);
  }

  return (
    <div className={mx('relative flex w-full', styles.barBg, classNames)}>
      <div className={mx('shrink-0', styles.barFg)} style={{ width: `${p}%` }}></div>
      {count !== total && (
        <div className='absolute top-0 bottom-0 flex items-center mx-0.5 text-black text-xs'>{count}</div>
      )}
    </div>
  );
};
