//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React from 'react';

import { log } from '@dxos/log';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Form } from '../Form';
import { ObjectTree } from './ObjectTree';

// Mirrors `dxos.config.Config` so the story exercises nested structs, arrays and enums.
const ConfigSchema = Schema.Struct({
  version: Schema.Number,
  runtime: Schema.Struct({
    client: Schema.Struct({
      log: Schema.Struct({ filter: Schema.String, prefix: Schema.String }),
      storage: Schema.Struct({
        persistent: Schema.Boolean,
        sqliteMode: Schema.Literals(['IDB_BATCH_ATOMIC', 'OPFS']),
        dataRoot: Schema.String,
      }),
      edgeFeatures: Schema.Struct({
        subductionReplicator: Schema.Boolean,
        signaling: Schema.Boolean,
      }),
      servicesMode: Schema.Literals(['LOCAL', 'SHARED_WORKER', 'DEDICATED_WORKER']),
      enableSnapshots: Schema.Boolean,
      snapshotInterval: Schema.Number,
    }),
    app: Schema.Struct({
      org: Schema.String,
      theme: Schema.String,
      website: Schema.String,
      build: Schema.Struct({
        timestamp: Schema.String,
        commitHash: Schema.String,
        version: Schema.String,
        branch: Schema.String,
      }),
    }),
    services: Schema.Struct({
      edge: Schema.Struct({ url: Schema.String }),
      signaling: Schema.Array(Schema.Struct({ server: Schema.String, api: Schema.String })),
      iceProviders: Schema.Array(Schema.Struct({ urls: Schema.String })),
    }),
    keys: Schema.Array(Schema.Struct({ name: Schema.String, value: Schema.String })),
  }),
});

type ConfigType = Schema.Schema.Type<typeof ConfigSchema>;

const value: ConfigType = {
  version: 1,
  runtime: {
    client: {
      log: { filter: 'info', prefix: 'app' },
      storage: {
        persistent: true,
        sqliteMode: 'OPFS',
        dataRoot: '/var/lib/dxos',
      },
      edgeFeatures: {
        subductionReplicator: true,
        signaling: true,
      },
      servicesMode: 'DEDICATED_WORKER',
      enableSnapshots: false,
      snapshotInterval: 60_000,
    },
    app: {
      org: 'DXOS',
      theme: 'dark',
      website: 'https://dxos.org',
      build: {
        timestamp: '2026-05-22T12:00:00Z',
        commitHash: 'abc1234',
        version: '0.8.3',
        branch: 'main',
      },
    },
    services: {
      edge: { url: 'wss://edge.dxos.org' },
      signaling: [
        { server: 'wss://signal-1.dxos.org', api: 'v1' },
        { server: 'wss://signal-2.dxos.org', api: 'v1' },
      ],
      iceProviders: [{ urls: 'turn:turn.dxos.org' }],
    },
    keys: [
      { name: 'OPENAI_API_KEY', value: 'sk-...' },
      { name: 'ANTHROPIC_API_KEY', value: 'ant-...' },
    ],
  },
};

const meta = {
  title: 'ui/react-ui-form/ObjectTree',
  component: ObjectTree,
  decorators: [withTheme(), withLayout({ layout: 'column', scroll: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ObjectTree>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schema: ConfigSchema,
    value: value,
  },
};

export const JSON = () => (
  <Syntax.Root data={value}>
    <Syntax.Content>
      <Syntax.Filter />
      <Syntax.Viewport>
        <Syntax.Code />
      </Syntax.Viewport>
    </Syntax.Content>
  </Syntax.Root>
);

// `db` is omitted because `ConfigSchema` is not an ECHO type.
export const WithForm = () => (
  <Form.Root
    schema={ConfigSchema}
    defaultValues={value}
    onSave={(next) => log.info('save', { next })}
    onCancel={() => log.info('cancel')}
  >
    <Form.Viewport>
      <Form.Content>
        <Form.FieldSet />
        <Form.Actions />
      </Form.Content>
    </Form.Viewport>
  </Form.Root>
);

export const WithReadOnlyForm = () => (
  <Form.Root schema={ConfigSchema} defaultValues={value} readonly={true}>
    <Form.Viewport>
      <Form.Content>
        <Form.FieldSet />
        <Form.Actions />
      </Form.Content>
    </Form.Viewport>
  </Form.Root>
);
