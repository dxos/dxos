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

export type ProcessCardProps = PropsWithChildren<{
  location: Process.Location;
  handle: Process.Handle.Any;
  /** Progress shown beside the elapsed time. */
  progress?: ReactNode;
  /** Removes the card once its process has ended. */
  onRemove?: () => void;
}>;

/** A spawned process's card: pid, location, state and elapsed time above the process's own view. */
export const ProcessCard = ({ location, handle, progress, onRemove, children }: ProcessCardProps) => {
  const status = useAtomValue(handle.statusAtom);
  const terminal = TERMINAL_STATES.includes(status.state);
  const now = useNow(!terminal);
  const end = Option.match(status.completedAt, { onNone: () => now, onSome: (date) => date.getTime() });

  const handleKill = () => {
    void EffectEx.runPromise(handle.terminate());
  };

  return (
    <Card.Root grid data-testid='process-tile'>
      <Card.Header>
        <Layout.Block>
          <Icon.Icon icon='ph--cpu--regular' />
        </Layout.Block>
        <Card.Title truncate classNames='font-mono'>
          {handle.pid}
        </Card.Title>
        {terminal ? (
          <Card.Action system='delete' onClick={onRemove} data-testid='process-remove' />
        ) : (
          <Card.Action icon='ph--stop-circle--regular' label='Kill' onClick={handleKill} data-testid='process-kill' />
        )}
      </Card.Header>
      <Card.Row
        icon={location.kind === 'edge' ? 'ph--cloud--regular' : 'ph--laptop--regular'}
        data-testid='process-location'
      >
        <Card.Text>{location.kind}</Card.Text>
      </Card.Row>
      <Card.Row icon='ph--pulse--regular' data-testid='process-state'>
        <Card.Text>{status.state}</Card.Text>
      </Card.Row>
      <Card.Row
        icon='ph--timer--regular'
        trailing={<Card.Text variant='muted'>{progress}</Card.Text>}
        data-testid='process-output'
      >
        <Card.Text classNames='font-mono'>{formatElapsed(end - status.startedAt.getTime())}</Card.Text>
      </Card.Row>
      <Card.Row span='full'>{children}</Card.Row>
    </Card.Root>
  );
};
