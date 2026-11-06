//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import { getStyles, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations.ts';
import { type LaneCardData, type ThreadLane } from '../../types.ts';

/** Lines a collapsed card shows: its tail, few enough that several running lanes stay on one screen. */
const COLLAPSED_LINES = 5;

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
export const LaneHeader = ({ lane, classNames }: { lane: ThreadLane; classNames?: string }) => {
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
      <span className='flex min-w-0 items-center gap-1'>
        <StatusIcon status={lane.status} />
        <StatusLabel lane={lane} />
      </span>
    </div>
  );
};

export type ThreadCardProps = LaneCardData & {
  /** The card changed height, for a host that must measure it again. */
  onResize?: () => void;
};

/** A lane as a card: its title, the tail of its work as one truncated line per message, and its state in a last row. */
export const ThreadCard = ({ lane, lines, onResize }: ThreadCardProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? lines : lines.slice(-COLLAPSED_LINES);

  useEffect(() => {
    const frame = requestAnimationFrame(() => onResize?.());
    return () => cancelAnimationFrame(frame);
  }, [onResize, expanded, lines]);

  return (
    <Card.Root grid classNames='w-[20rem] max-w-full' data-testid='chat.lane-card'>
      <Card.Header>
        <Layout.Block>
          <span className={mx('inline-block size-2 rounded-full', getStyles(lane.hue).bg)} />
        </Layout.Block>
        <Card.Title truncate>{lane.title ?? t('lane.untitled')}</Card.Title>
        <Card.Action
          icon={expanded ? 'ph--caret-up--regular' : 'ph--caret-down--regular'}
          label={t(expanded ? 'lane.collapse' : 'lane.expand')}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        />
      </Card.Header>
      <Card.Body>
        <Card.Row span='full'>
          <div className='flex min-w-0 flex-col px-2'>
            {shown.map((line, index) => (
              <Card.Text
                key={index}
                truncate={!expanded}
                classNames={mx('py-0 text-sm leading-5', expanded && 'whitespace-pre-wrap wrap-break-word')}
              >
                <span className='text-fg-muted'>{line.name ?? line.role}: </span>
                {line.text}
              </Card.Text>
            ))}
          </div>
        </Card.Row>
      </Card.Body>
      <Card.Row
        leading={<StatusIcon status={lane.status} />}
        trailing={lane.owner && <span className='text-xs text-fg-muted'>{lane.owner}</span>}
      >
        <StatusLabel lane={lane} />
      </Card.Row>
    </Card.Root>
  );
};

ThreadCard.displayName = 'ThreadCard';

/** Lays cards out in the thread: side by side, wrapping at its width, each as tall as its own content. */
export const ThreadCardFlow = ({ children }: PropsWithChildren) => (
  <div className='flex flex-wrap items-start gap-2'>{children}</div>
);

ThreadCardFlow.displayName = 'ThreadCardFlow';
