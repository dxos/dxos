//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Connection } from '@dxos/plugin-connector';
import { PreviewPlugin } from '@dxos/plugin-preview/plugin';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { type AtprotoCodec, AtprotoRecordAnnotation, AtprotoVisibilityAnnotation } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import { translations } from '#translations';
import { AtprotoCapabilities, AtprotoPublication } from '#types';

import * as AtprotoRepo from '../../services/AtprotoRepo';

import { PdsBrowser } from './PdsBrowser';

// Default the input to a real handle so the story opens on a live repo; `alice.test` still resolves to the
// in-memory mock (deterministic, with a mapped collection to preview/import) when typed.
const DEFAULT_HANDLE = 'dxos.org';
const MOCK_HANDLE = 'alice.test';
const NOTE_COLLECTION = 'com.example.note';
const POST_COLLECTION = 'app.bsky.feed.post';

const demoCodec: AtprotoCodec = {
  encode: async (object) => ({ text: (object as { title?: string }).title ?? '' }),
  decode: async (record) => ({ title: typeof record.text === 'string' ? record.text : '' }),
};

// A mapped type (its collection is "mapped" in the browser); registered per-story.
class DemoNote extends Type.makeObject<DemoNote>(DXN.make('org.dxos.plugin.atproto.pdsDemoNote', '0.1.0'))(
  Schema.Struct({ title: Schema.String.pipe(AtprotoVisibilityAnnotation.set('publish')) }).pipe(
    LabelAnnotation.set(['title']),
    AtprotoRecordAnnotation.set({ collection: NOTE_COLLECTION, rkey: 'tid', codec: demoCodec }),
  ),
) {}

// Shared in-memory repo pre-seeded with a mapped collection and an unmapped one.
const mock = AtprotoRepo.makeMock('did:mock:alice');
Effect.runSync(mock.putRecord({ collection: NOTE_COLLECTION, rkey: 'note-1', record: { text: 'The Odyssey' } }));
Effect.runSync(mock.putRecord({ collection: NOTE_COLLECTION, rkey: 'note-2', record: { text: 'The Iliad' } }));
Effect.runSync(
  mock.putRecord({ collection: POST_COLLECTION, rkey: 'post-1', record: { text: 'hello world', createdAt: 'now' } }),
);

const seed = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
    yield* initializeIdentity(client);
    const [space] = client.spaces.get();
    yield* Effect.promise(() => space.waitUntilReady());
    const token = space.db.add(
      Obj.make(AccessToken.AccessToken, { source: 'bsky.app', token: 'tok', account: DEFAULT_HANDLE }),
    );
    space.db.add(
      Obj.make(Connection.Connection, { name: DEFAULT_HANDLE, connectorId: 'bluesky', accessToken: Ref.make(token) }),
    );
    yield* Effect.promise(() => space.db.flush({ indexes: true }));
  });

const Story = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }
  return <PdsBrowser space={space} role='article' />;
};

const meta = {
  title: 'plugins/plugin-atproto/PdsBrowser',
  render: Story,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contributes(AppCapabilities.Translations, translations),
        // The browser reads via ReadRepoLayer (by handle). The seeded `alice.test` account resolves to the
        // in-memory mock (deterministic, with a mapped collection to preview/import); any other handle hits
        // the real public repo so entering your own handle actually browses that PDS.
        Capability.contributes(AtprotoCapabilities.ReadRepoLayer, (handle: string) =>
          handle === MOCK_HANDLE ? AtprotoRepo.layerMock(mock) : AtprotoRepo.layerPublic(handle),
        ),
      ],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        PreviewPlugin(),
        ClientPlugin({
          types: [Connection.Connection, AccessToken.AccessToken, AtprotoPublication.AtprotoPublication, DemoNote],
          onClientInitialized: seed,
        }),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Story>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
