//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Feed } from '@dxos/echo';

import { buildChannelFormSchema, resolveProvider } from './channel-backend';
import * as ThreadCapabilities from './ThreadCapabilities';

describe('channel-backend helpers', () => {
  test('resolveProvider finds by kind', ({ expect }) => {
    const providers = [fakeProvider('a', Schema.Struct({})), fakeProvider('b', Schema.Struct({}))];
    expect(resolveProvider(providers, 'b')?.kind).to.eq('b');
    expect(resolveProvider(providers, 'missing')).to.be.undefined;
  });

  test('buildChannelFormSchema with a single empty-field provider is just a name field', ({ expect }) => {
    const schema = buildChannelFormSchema([fakeProvider('feed', Schema.Struct({}))]);
    const value = Schema.decodeUnknownSync(schema)({ name: 'general' });
    expect(value.name).to.eq('general');
    expect(value.backend).to.be.undefined;
  });

  test('buildChannelFormSchema with multiple providers builds a discriminated backend union', ({ expect }) => {
    const schema = buildChannelFormSchema([
      fakeProvider('feed', Schema.Struct({})),
      fakeProvider('atproto', Schema.Struct({ channelId: Schema.String })),
    ]);
    const feedValue = Schema.decodeUnknownSync(schema)({ name: 'x', backend: { kind: 'feed' } });
    expect(feedValue.backend.kind).to.eq('feed');
    const atValue = Schema.decodeUnknownSync(schema)({ name: 'y', backend: { kind: 'atproto', channelId: 'c' } });
    expect(atValue.backend.kind).to.eq('atproto');
    expect(atValue.backend.channelId).to.eq('c');
  });
});

const fakeProvider = (kind: string, fields: Schema.Schema.AnyNoContext): ThreadCapabilities.ChannelBackendProvider => ({
  kind,
  label: kind,
  createFields: fields,
  makeConfig: () => Feed.make(),
  subscribe: () => () => {},
  send: () => Effect.void,
});
