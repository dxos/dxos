//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import React, { useEffect, useState } from 'react';

import * as Process from '@dxos/compute/Process';
import { EffectEx } from '@dxos/effect';
import { Block, Button, Card, Focus } from '@dxos/react-ui';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';

import { type TickerOutput } from '../testing/index.ts';

export type ProcessItem = {
  id: string;
  location: Process.Location;
  handle: Process.Handle<void, TickerOutput, never>;
};

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

/** Latest output of the process; the subscription also drives a remote handle's status polling. */
const useLatestOutput = (handle: ProcessItem['handle']): TickerOutput | undefined => {
  const [output, setOutput] = useState<TickerOutput>();
  useEffect(() => {
    const fiber = Effect.runFork(
      Stream.runForEach(handle.subscribeOutputs(), (next) => Effect.sync(() => setOutput(next))),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [handle]);
  return output;
};

export const ProcessTile: MosaicStackTileComponent<ProcessItem> = (props) => {
  const { handle, location } = props.data;
  const status = useAtomValue(handle.statusAtom);
  const output = useLatestOutput(handle);
  const terminal = TERMINAL_STATES.includes(status.state);
  const now = useNow(!terminal);
  const end = Option.match(status.completedAt, { onNone: () => now, onSome: (date) => date.getTime() });

  const handleKill = () => {
    void EffectEx.runPromise(handle.terminate());
  };

  return (
    <Mosaic.Tile {...props} asChild>
      <Focus.Item asChild>
        <Card.Root classNames='dx-hover' data-testid='process-tile'>
          <Card.Header>
            <Card.Title classNames='font-mono'>{handle.pid}</Card.Title>
            <Block rail='end'>
              <Button
                iconOnly
                variant='ghost'
                icon='ph--x-circle--regular'
                label='Kill'
                disabled={terminal}
                onClick={handleKill}
                data-testid='process-kill'
              />
            </Block>
          </Card.Header>
          <Card.Row>
            <div className='grid grid-cols-[auto_1fr] gap-x-3 text-sm'>
              <span className='text-fg-muted'>Location</span>
              <span data-testid='process-location'>{location}</span>
              <span className='text-fg-muted'>State</span>
              <span data-testid='process-state'>{status.state}</span>
              <span className='text-fg-muted'>Elapsed</span>
              <span className='font-mono'>{formatElapsed(end - status.startedAt.getTime())}</span>
              <span className='text-fg-muted'>Output</span>
              <span className='font-mono' data-testid='process-output'>
                {output ? `#${output.tick} prime=${output.prime}` : '—'}
              </span>
            </div>
          </Card.Row>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
};

ProcessTile.displayName = 'ProcessTile';
