//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { parseProto } from '@dxos/effect-proto';
import { log } from '@dxos/log';
import { type Config as ConfigProto, Runtime } from '@dxos/protocols/proto/dxos/config';
// Raw .proto source resolved through `@dxos/protocols`'s `./proto/dxos/*.proto`
// exports entry. Vite's `?raw` query suffix returns the file as a string so we
// can hand it straight to `parseProto` -- the same flow the unit test uses.
import configProto from '@dxos/protocols/proto/dxos/config.proto?raw';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Form } from '../Form';
import { ObjectTree } from './ObjectTree';

const registry = parseProto(configProto);
const ConfigSchema = registry.get('dxos.config.Config');

// A representative Config value that exercises nested messages, arrays, enums
// (rendered as their string names by the proto codec), and `google.protobuf.Any`.
const value: ConfigProto = {
  version: 1,
  runtime: {
    client: {
      log: { filter: 'info', prefix: 'app' },
      storage: {
        persistent: true,
        sqliteMode: Runtime.Client.Storage.SqliteMode.OPFS,
        dataRoot: '/var/lib/dxos',
      },
      edgeFeatures: {
        echoReplicator: true,
        subductionReplicator: true,
        signaling: true,
      },
      servicesMode: Runtime.Client.ServicesMode.SHARED_WORKER,
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

// Renders the same proto-derived `ConfigSchema` + `value` through the
// interactive `Form` component, for side-by-side comparison with the
// read-only ObjectTree above. `db` is intentionally omitted -- the proto
// schema is not an ECHO type, so there's no space/database in play.
export const WithForm = () => (
  <Form.Root
    schema={ConfigSchema as any}
    defaultValues={value as any}
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
  <Form.Root schema={ConfigSchema as any} defaultValues={value as any} readonly={true}>
    <Form.Viewport>
      <Form.Content>
        <Form.FieldSet />
        <Form.Actions />
      </Form.Content>
    </Form.Viewport>
  </Form.Root>
);
