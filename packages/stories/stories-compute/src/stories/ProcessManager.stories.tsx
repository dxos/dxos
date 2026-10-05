//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import React, { useCallback, useContext, useEffect, useState } from 'react';

import * as Process from '@dxos/compute/Process';
import { Config } from '@dxos/config';
import { useClient } from '@dxos/react-client';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Focus, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Dnd } from '@dxos/react-ui-dnd';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { CommandModule, type ProcessItem, ProcessTile } from '../components/index.ts';
import { type RemoteMode, TickerProcess, makeComputeLayer } from '../testing/index.ts';

type StoryProps = {
  remote: RemoteMode;
};

const DefaultStory = ({ remote }: StoryProps) => {
  const client = useClient();
  const { space } = useClientStory();
  const registry = useContext(RegistryContext);
  const [items, setItems] = useState<ProcessItem[]>([]);

  // Created in the effect so a StrictMode remount builds a fresh runtime rather than reusing a disposed one.
  const [runtime, setRuntime] = useState<ManagedRuntime.ManagedRuntime<Process.ManagerService, never>>();
  useEffect(() => {
    const next = ManagedRuntime.make(makeComputeLayer({ registry, remote, client }));
    setRuntime(next);
    return () => {
      setItems([]);
      void next.dispose();
    };
  }, [registry, remote, client]);

  const [error, setError] = useState<string>();
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const handleCreate = useCallback(
    (location: Process.Location) => {
      if (!runtime || !space) {
        return;
      }
      setError(undefined);
      void runtime
        .runPromiseExit(
          Effect.gen(function* () {
            const manager = yield* Process.ManagerService;
            return yield* manager.spawn(TickerProcess, { name: 'Ticker', location, environment: { space: space.id } });
          }),
        )
        .then((exit) =>
          Exit.match(exit, {
            onSuccess: (handle) => setItems((prev) => [{ id: handle.pid, location, handle }, ...prev]),
            onFailure: (cause) => setError(Cause.pretty(cause)),
          }),
        );
    },
    [runtime, space],
  );

  return (
    <div className='dx-cover grid grid-cols-[20rem_1fr] divide-x divide-separator'>
      <CommandModule remote={remote} ready={!!runtime && !!space} error={error} onCreate={handleCreate} />
      <Dnd.Root>
        <Panel.Root>
          <Panel.Header>
            <Toolbar.Root>
              <Toolbar.Text>Processes: {items.length}</Toolbar.Text>
            </Toolbar.Root>
          </Panel.Header>
          <Panel.Body asChild>
            <Focus.Group asChild>
              <Mosaic.Container asChild orientation='vertical' autoScroll={viewport}>
                <ScrollArea.Root orientation='vertical'>
                  <ScrollArea.Viewport ref={setViewport}>
                    <Mosaic.Stack
                      items={items}
                      getId={(item) => item.id}
                      Tile={ProcessTile}
                      draggable={false}
                      orientation='vertical'
                    />
                  </ScrollArea.Viewport>
                </ScrollArea.Root>
              </Mosaic.Container>
            </Focus.Group>
          </Panel.Body>
        </Panel.Root>
      </Dnd.Root>
    </div>
  );
};

/** Client config pointing at the dev EDGE service, for the story that spawns there for real. */
const edgeConfig = new Config({
  version: 1,
  runtime: {
    client: { edgeFeatures: { signaling: true, agents: true } },
    services: { edge: { url: 'https://dev.dxos.network' } },
  },
});

const meta: Meta<typeof DefaultStory> = {
  title: 'stories/stories-compute/ProcessManager',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', controls: { disable: true } },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Remote processes run on a second in-memory runtime behind the EDGE control surface. */
export const Default: Story = {
  args: { remote: 'simulated' },
  decorators: [withClientProvider({ createIdentity: true, createSpace: true })],
};

/** Remote processes run on the dev EDGE service, which must host the ticker's process key. */
export const Edge: Story = {
  args: { remote: 'edge' },
  decorators: [withClientProvider({ createIdentity: true, createSpace: true, config: edgeConfig })],
};
