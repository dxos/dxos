//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useEffect, useMemo, useRef } from 'react';

import { type CallMetadata, log } from '@dxos/log';
import {
  type DebugPortController,
  type DebugPortStartOptions,
  type DebugPortStatus,
} from '@dxos/react-client/devtools';
import { ViewStateProvider } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DebugPortSettings } from './DebugPortSettings';

const DEBUG_PORT_ORIGIN = 'http://127.0.0.1:9321';

/** Matches the path `DebugPortSettings` filters the log panel on. */
const CONTROLLER_META: CallMetadata = {
  F: 'packages/sdk/client/src/devtools/debug-port-controller.ts',
  L: 1,
  S: undefined,
};

/**
 * Stand-in for the page-wide controller: the real one long-polls a loopback server and evaluates
 * whatever it returns, which a story must never do.
 */
const createFakeController = (initial: Partial<DebugPortStatus> = {}): DebugPortController => {
  const listeners = new Set<() => void>();
  let status: DebugPortStatus = { running: false, ...initial };

  const update = (patch: Partial<DebugPortStatus>) => {
    status = { ...status, ...patch };
    listeners.forEach((listener) => listener());
  };

  // The panel reads its rows from the process-wide log buffer, so the fake emits through the same
  // logger the real controller uses rather than carrying a log of its own. The metadata spoofs the
  // controller's file because the panel filters on it — logging from here would be filtered out.
  const emit = (line: string, session?: string) => log.info(line, { session }, CONTROLLER_META);

  return {
    getStatus: () => status,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: (_options?: DebugPortStartOptions) => {
      const session = crypto.randomUUID();
      update({ running: true, session, origin: DEBUG_PORT_ORIGIN });
      emit(`Session: ${session}`, session);
      emit(`Connecting to ${DEBUG_PORT_ORIGIN}…`, session);
      emit('Waiting for debug server…', session);
      return session;
    },
    // Nothing is persisted in a story, so there is never a session to carry across a reload.
    resume: () => undefined,
    stop: () => {
      emit('Debug port stopped.', status.session);
      update({ running: false });
    },
  };
};

/** `Form.Row` reads the form context for its variant; the section itself binds no fields. */
const NoFields = Schema.Struct({});

type StoryArgs = {
  initial?: Partial<DebugPortStatus>;
  /** Emitted into the shared log buffer on mount, standing in for a session already under way. */
  lines?: string[];
};

const DefaultStory = ({ initial, lines = [] }: StoryArgs) => {
  const controller = useMemo(() => createFakeController(initial), [initial]);
  // Seed the shared buffer so a story that opens already-running has rows to show. The buffer
  // outlives the component, so a remount (StrictMode, story switch) must not append a second copy.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) {
      return;
    }
    seeded.current = true;
    lines.forEach((line) => log.info(line, { session: initial?.session }, CONTROLLER_META));
  }, [lines, initial?.session]);

  return (
    // `Logger.Root` keeps its per-file level overrides in view state.
    <ViewStateProvider>
      <Form.Root schema={NoFields} values={{}} variant='settings'>
        <Form.Viewport scroll>
          <Form.Content>
            <DebugPortSettings controller={controller} />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </ViewStateProvider>
  );
};

const meta = {
  title: 'plugins/plugin-debug/containers/DebugPortSettings',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  tags: ['settings'],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Stopped: Story = {
  args: {},
};

export const Running: Story = {
  args: {
    initial: {
      running: true,
      session: '951c7576-b636-47ff-acc6-a1c4fdf65fb6',
      origin: DEBUG_PORT_ORIGIN,
    },
    lines: [
      'Session: 951c7576-b636-47ff-acc6-a1c4fdf65fb6',
      `Connecting to ${DEBUG_PORT_ORIGIN}…`,
      'Command #1:',
      'return dxos.client.spaces.get().length',
      'Command #1 ok',
    ],
  },
};
