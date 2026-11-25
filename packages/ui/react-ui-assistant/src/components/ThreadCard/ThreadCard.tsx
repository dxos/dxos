//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import { getStyles, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations.ts';
import { type LaneCardData, type ThreadLane } from '../../types.ts';

const elapsed = (started: string, now: number): string => {
  const seconds = Math.max(0, Math.round((now - Date.parse(started)) / 1_000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const STATUS_ICON: Record<ThreadLane['status'], string> = {
  running: 'ph--spinner-gap--regular',
  waiting: 'ph--hourglass--regular',
  done: 'ph--check--regular',
  failed: 'ph--warning--regular',
};

const StatusIcon = ({ status }: { status: ThreadLane['status'] }) => (
  <Icon.Icon icon={STATUS_ICON[status]} size='sm' classNames={mx(status === 'running' && 'animate-spin')} />
);

/** A lane's state in words and, while it runs, how long it has been running. */
const StatusLabel = ({ lane }: { lane: ThreadLane }) => {
  const { t } = Hooks.useTranslation(translationKey);
  const [now, setNow] = useState(Date.now);
  const running = lane.status === 'running' || lane.status === 'waiting';
  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <span className='flex min-w-0 items-center gap-1 text-xs text-fg-muted' data-testid='chat.lane-status'>
      {lane.status === 'waiting' && lane.waitingOn ? (
        <>
          <span className='shrink-0'>{t('lane.waiting-on')}</span>
          <span className={mx('inline-block size-2 shrink-0 rounded-full', getStyles(lane.waitingOn.hue).bg)} />
          <span className='truncate'>{lane.waitingOn.title}</span>
        </>
      ) : (
        t(`lane.${lane.status}`)
      )}
      {running && <span className='shrink-0 tabular-nums'>{elapsed(lane.started, now)}</span>}
    </span>
  );
};

/** One line naming a lane in the transcript: its colour, title, owner and state. */
export const LaneHeader = ({
  lane,
  classNames,
  statusEnd = false,
}: {
  lane: ThreadLane;
  classNames?: string;
  /** Pushes the state to the end of the line, for a row that spans the thread. */
  statusEnd?: boolean;
}) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <div
      className={mx('flex min-w-0 items-center gap-2 text-xs text-fg-muted', classNames)}
      data-testid='chat.lane-header'
      data-lane-status={lane.status}
    >
      <span className={mx('inline-block size-2 shrink-0 rounded-full', getStyles(lane.hue).bg)} />
      <span className='truncate text-fg'>{lane.title ?? t('lane.untitled')}</span>
      {lane.owner && <span className='truncate'>{lane.owner}</span>}
      <span className={mx('flex min-w-0 items-center gap-1', statusEnd && 'ms-auto')}>
        <StatusIcon status={lane.status} />
        <StatusLabel lane={lane} />
      </span>
    </div>
  );
};

export type ThreadCardProps = LaneCardData & {
  /** The row changed height, for a host that must measure it again. */
  onResize?: () => void;
};

/** A lane working out of view as one row: its colour, title, who runs it and its state. */
export const ThreadCard = ({ lane, onResize }: ThreadCardProps) => {
  useEffect(() => {
    const frame = requestAnimationFrame(() => onResize?.());
    return () => cancelAnimationFrame(frame);
  }, [onResize, lane.status]);

  return (
    <Layout.Flex align='center' classNames='min-w-0 px-2 py-1' data-testid='chat.lane-card'>
      <LaneHeader lane={lane} classNames='flex-1' statusEnd />
    </Layout.Flex>
  );
};

ThreadCard.displayName = 'ThreadCard';

/** Stacks lane rows in the thread, one under another. */
export const ThreadCardFlow = ({ children }: PropsWithChildren) => (
  <Layout.Flex column gap='xs'>
    {children}
  </Layout.Flex>
);

ThreadCardFlow.displayName = 'ThreadCardFlow';
