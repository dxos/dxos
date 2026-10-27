//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, type ReactNode, useEffect, useState } from 'react';

import * as Process from '@dxos/compute/Process';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';

const TERMINAL_STATES: readonly Process.State[] = [
  Process.State.SUCCEEDED,
  Process.State.FAILED,
  Process.State.TERMINATED,
];

const formatElapsed = (ms: number): string => {
  const seconds = Math.floor(ms / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** Re-renders once a second while `active`, so elapsed time advances without a status change. */
const useNow = (active: boolean): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [active]);
  return now;
};

export type ProcessCardViewProps = PropsWithChildren<{
  pid: string;
  location: Process.Location['kind'];
  state: Process.State;
  /** Time since the process started, frozen once it ends. */
  elapsed: number;
  /** Progress shown beside the elapsed time. */
  progress?: ReactNode;
  onKill?: () => void;
  /** Removes the card once its process has ended. */
  onRemove?: () => void;
}>;

/** A process's card from plain values: pid, location, state and elapsed time above the process's own view. */
export const ProcessCardView = ({
  pid,
  location,
  state,
  elapsed,
  progress,
  onKill,
  onRemove,
  children,
}: ProcessCardViewProps) => (
  <Card.Root grid data-testid='process-tile'>
    <Card.Header>
      <Layout.Block rail='start'>
        <Icon.Icon icon='ph--cpu--regular' />
      </Layout.Block>
      <Card.Title truncate classNames='font-mono'>
        {pid}
      </Card.Title>
      {TERMINAL_STATES.includes(state) ? (
        <Card.Action system='delete' onClick={onRemove} data-testid='process-remove' />
      ) : (
        <Card.Action icon='ph--stop-circle--regular' label='Kill' onClick={onKill} data-testid='process-kill' />
      )}
    </Card.Header>
    <Card.Row icon={location === 'edge' ? 'ph--cloud--regular' : 'ph--laptop--regular'} data-testid='process-location'>
      <Card.Text>{location}</Card.Text>
    </Card.Row>
    <Card.Row icon='ph--pulse--regular' data-testid='process-state'>
      <Card.Text>{state}</Card.Text>
    </Card.Row>
    <Card.Row
      icon='ph--timer--regular'
      trailing={progress != null ? <Card.Text variant='muted'>{progress}</Card.Text> : undefined}
      data-testid='process-output'
    >
      <Card.Text classNames='font-mono'>{formatElapsed(elapsed)}</Card.Text>
    </Card.Row>
    {children != null && <Card.Row span='full'>{children}</Card.Row>}
  </Card.Root>
);

export type ProcessCardProps = Omit<ProcessCardViewProps, 'pid' | 'location' | 'state' | 'elapsed' | 'onKill'> & {
  location: Process.Location;
  handle: Process.Any;
};

/** A spawned process's card, following the handle's status. */
export const ProcessCard = ({ location, handle, ...props }: ProcessCardProps) => {
  const status = useAtomValue(handle.statusAtom);
  const now = useNow(!TERMINAL_STATES.includes(status.state));
  const end = Option.match(status.completedAt, { onNone: () => now, onSome: (date) => date.getTime() });

  const handleKill = () => {
    void EffectEx.runPromise(handle.terminate());
  };

  return (
    <ProcessCardView
      {...props}
      pid={handle.pid}
      location={location.kind}
      state={status.state}
      elapsed={end - status.startedAt.getTime()}
      onKill={handleKill}
    />
  );
};
