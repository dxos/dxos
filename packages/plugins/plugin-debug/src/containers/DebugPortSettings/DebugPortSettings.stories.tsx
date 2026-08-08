//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import {
  type DebugPortController,
  type DebugPortStartOptions,
  type DebugPortStatus,
} from '@dxos/react-client/devtools';
import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DebugPortSettings } from './DebugPortSettings';

/**
 * Stand-in for the page-wide controller: the real one long-polls a loopback server and evaluates
 * whatever it returns, which a story must never do.
 */
const createFakeController = (initial: Partial<DebugPortStatus> = {}): DebugPortController => {
  const listeners = new Set<() => void>();
  let status: DebugPortStatus = { running: false, log: [], ...initial };

  const update = (patch: Partial<DebugPortStatus>) => {
    status = { ...status, ...patch };
    listeners.forEach((listener) => listener());
  };

  return {
    getStatus: () => status,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: (_options?: DebugPortStartOptions) => {
      const session = crypto.randomUUID();
      update({
        running: true,
        session,
        origin: 'http://127.0.0.1:9321',
        log: [`Session: ${session}`, 'Connecting to http://127.0.0.1:9321…', 'Waiting for debug server…'],
      });
      return session;
    },
    stop: () => update({ running: false, log: [...status.log, 'Debug port stopped.'] }),
  };
};

/** `Form.Row` reads the form context for its variant; the section itself binds no fields. */
const NoFields = Schema.Struct({});

type StoryProps = {
  initial?: Partial<DebugPortStatus>;
};

const DefaultStory = ({ initial }: StoryProps) => {
  const controller = useMemo(() => createFakeController(initial), [initial]);

  return (
    <Form.Root schema={NoFields} values={{}} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <DebugPortSettings controller={controller} />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
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
      origin: 'http://127.0.0.1:9321',
      log: [
        'Session: 951c7576-b636-47ff-acc6-a1c4fdf65fb6',
        'Connecting to http://127.0.0.1:9321…',
        'Command #1:',
        'return dxos.client.spaces.get().length',
        'Command #1 ok',
      ],
    },
  },
};
