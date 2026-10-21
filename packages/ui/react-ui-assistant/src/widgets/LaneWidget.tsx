//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';
import { getStyles, mx } from '@dxos/ui-theme';

import { translationKey } from '../translations.ts';
import { type LaneCardData, type ThreadLane } from '../types.ts';

/** Height of a background lane's tail: a few lines, so several running lanes stay on one screen. */
export const LANE_CARD_HEIGHT = 168;

const parse = (children: WidgetProps['children']): LaneCardData | undefined => {
  const text = getXmlTextChild(children ?? []);
  if (!text) {
    return undefined;
  }
  try {
    const value: LaneCardData = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
};

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

/**
 * One line naming a lane: its colour, title, owner and state; shared by the lane's header in the transcript, its
 * background card and its completion notice.
 */
export const LaneHeader = ({ lane, classNames }: { lane: ThreadLane; classNames?: string }) => {
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
    <div
      className={mx('flex min-w-0 items-center gap-2 text-xs text-fg-muted', classNames)}
      data-testid='chat.lane-header'
      data-lane-status={lane.status}
    >
      <span className={mx('inline-block size-2 shrink-0 rounded-full', getStyles(lane.hue).bg)} />
      <span className='truncate text-fg'>{lane.title ?? t('lane.untitled')}</span>
      {lane.owner && <span className='truncate'>{lane.owner}</span>}
      <span className='flex shrink-0 items-center gap-1'>
        <Icon.Icon
          icon={STATUS_ICON[lane.status]}
          size='sm'
          classNames={mx(lane.status === 'running' && 'animate-spin')}
        />
        {lane.status === 'waiting' && lane.waitingOn ? (
          <span className='flex items-center gap-1'>
            {t('lane.waiting-on')}
            <span className={mx('inline-block size-2 rounded-full', getStyles(lane.waitingOn.hue).bg)} />
            <span className='truncate'>{lane.waitingOn.title}</span>
          </span>
        ) : (
          t(`lane.${lane.status}`)
        )}
        {running && <span className='tabular-nums'>{elapsed(lane.started, now)}</span>}
      </span>
    </div>
  );
};

const Lines = ({ lines }: { lines: LaneCardData['lines'] }) => (
  <>
    {lines.map((line, index) => (
      <div key={index} className='min-w-0 whitespace-pre-wrap wrap-break-word'>
        <span className='text-fg-muted'>{line.name ?? line.role}: </span>
        {line.text}
      </div>
    ))}
  </>
);

/**
 * A lane running in the background: a fixed-height box that follows the lane's tail, so the request in the
 * foreground keeps its place while this one works; expands on request.
 */
export const LaneCardWidget = ({ view, children }: WidgetProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const data = parse(children);
  const [expanded, setExpanded] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Follows the tail: the newest work of a background lane is what the reader wants to glance at.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && !expanded) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [data, expanded]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => view?.requestMeasure());
    return () => cancelAnimationFrame(frame);
  }, [view, expanded]);

  if (!data) {
    return null;
  }

  return (
    <div
      className={mx('w-0 min-w-full border-s-2 rounded-sm bg-input-surface', getStyles(data.lane.hue).border)}
      data-testid='chat.lane-card'
    >
      <button
        type='button'
        className='flex w-full items-center gap-2 px-3 pt-2 text-start'
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <LaneHeader lane={data.lane} classNames='flex-1' />
        <Icon.Icon icon={expanded ? 'ph--caret-up--regular' : 'ph--caret-down--regular'} size='sm' />
        <span className='sr-only'>{t(expanded ? 'lane.collapse' : 'lane.expand')}</span>
      </button>
      <div
        ref={scrollerRef}
        className='overflow-y-auto px-3 py-2 text-sm'
        style={expanded ? undefined : { height: LANE_CARD_HEIGHT }}
      >
        <Lines lines={data.lines} />
      </div>
    </div>
  );
};

/**
 * A lane that finished in the background: its last answer, echoed at the end of the transcript in the lane's
 * colour, so it is seen without the reader leaving their place.
 */
export const LaneNoticeWidget = ({ view, children }: WidgetProps) => {
  const data = parse(children);
  useEffect(() => {
    const frame = requestAnimationFrame(() => view?.requestMeasure());
    return () => cancelAnimationFrame(frame);
  }, [view]);

  if (!data) {
    return null;
  }

  return (
    <div
      className={mx('w-0 min-w-full border-s-2 rounded-sm px-3 py-2 bg-input-surface', getStyles(data.lane.hue).border)}
      data-testid='chat.lane-notice'
    >
      <LaneHeader lane={data.lane} />
      <div className='pt-1 text-sm'>
        <Lines lines={data.lines} />
      </div>
    </div>
  );
};
