//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type Client } from '@dxos/client';
import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { Panproto } from '@dxos/echo-panproto';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { AccessToken } from '@dxos/link';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Connection from '@dxos/plugin-connector/Connection';
import { PreviewPlugin } from '@dxos/plugin-preview/plugin';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { AtprotoRecordAnnotation, AtprotoVisibilityAnnotation } from '@dxos/schema';

import { translations } from '#translations';

import * as AtprotoRepo from '../../services/AtprotoRepo';
import * as AtprotoCapabilities from '../../types/AtprotoCapabilities';
import * as AtprotoPublication from '../../types/AtprotoPublication';
import { PdsBrowser } from './PdsBrowser';

// Default the input to a real handle so the story opens on a live repo; `alice.test` still resolves to the
// in-memory mock (deterministic, with a mapped collection to preview/import) when typed.
const DEFAULT_HANDLE = 'dxos.org';
const MOCK_HANDLE = 'alice.test';
const NOTE_COLLECTION = 'com.example.note';
const POST_COLLECTION = 'app.bsky.feed.post';

// Maps the public `title` to/from the wire `text` (the scalar adapter is symmetric).
const demoLens: Panproto.Lens = { adapters: [{ kind: 'scalar', wire: 'text', echo: ['title'] }] };

// A mapped type (its collection is "mapped" in the browser); registered per-story.
class DemoNote extends Type.makeObject<DemoNote>(DXN.make('org.dxos.plugin.atproto.pdsDemoNote', '0.1.0'))(
  Schema.Struct({ title: Schema.String.pipe(AtprotoVisibilityAnnotation.set('publish')) }).pipe(
    LabelAnnotation.set(['title']),
    AtprotoRecordAnnotation.set({ collection: NOTE_COLLECTION, rkey: 'tid', lens: demoLens }),
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
        Capability.contribute(AppCapabilities.Translations, translations),
        // The browser reads via ReadRepoLayer (by handle). The seeded `alice.test` account resolves to the
        // in-memory mock (deterministic, with a mapped collection to preview/import); any other handle hits
        // the real public repo so entering your own handle actually browses that PDS.
        Capability.contribute(AtprotoCapabilities.ReadRepoLayer, (handle: string) =>
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
