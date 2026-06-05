//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { buildChannelFormSchema, resolveProvider } from './channel-backend';
import { type ChannelBackendProvider } from './ThreadCapabilities';

const fakeProvider = (kind: string, fields: Schema.Struct<any>): ChannelBackendProvider => ({
  kind,
  label: kind,
  createFields: fields,
  makeConfig: () => Obj.make(Schema.Struct({}), {}),
  subscribe: () => () => {},
  send: () => undefined as any,
});

describe('channel-backend helpers', () => {
  test('resolveProvider finds by kind', ({ expect }) => {
    const providers = [fakeProvider('a', Schema.Struct({})), fakeProvider('b', Schema.Struct({}))];
    expect(resolveProvider(providers, 'b')?.kind).to.eq('b');
    expect(resolveProvider(providers, 'missing')).to.be.undefined;
  });

  test('buildChannelFormSchema with a single empty-field provider is just a name field', ({ expect }) => {
    const schema = buildChannelFormSchema([fakeProvider('feed', Schema.Struct({}))]);
    const value = Schema.decodeUnknownSync(schema)({ name: 'general' }) as { name?: string; backend?: unknown };
    expect(value.name).to.eq('general');
    expect(value.backend).to.be.undefined;
  });

  test('buildChannelFormSchema with multiple providers builds a discriminated backend union', ({ expect }) => {
    const schema = buildChannelFormSchema([
      fakeProvider('feed', Schema.Struct({})),
      fakeProvider('atproto', Schema.Struct({ channelId: Schema.String })),
    ]);
    const feedValue = Schema.decodeUnknownSync(schema)({ name: 'x', backend: { kind: 'feed' } }) as any;
    expect(feedValue.backend.kind).to.eq('feed');
    const atValue = Schema.decodeUnknownSync(schema)({ name: 'y', backend: { kind: 'atproto', channelId: 'c' } }) as any;
    expect(atValue.backend.kind).to.eq('atproto');
    expect(atValue.backend.channelId).to.eq('c');
  });
});
