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
import { DXN, Filter, Obj, Ref, Relation, Type } from '@dxos/echo';
import { Panproto } from '@dxos/echo-panproto';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Connection } from '@dxos/plugin-connector';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { AtprotoRecordAnnotation, AtprotoVisibilityAnnotation } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import { translations } from '#translations';
import { AtprotoCapabilities, AtprotoPublication } from '#types';

import { hashRecord } from '../../hash';
import * as AtprotoRepo from '../../services/AtprotoRepo';
import { AtprotoCompanion } from './AtprotoCompanion';

const NOTE_COLLECTION = 'com.example.note';

// A minimal atproto-annotated type: public `title` (mapped to the wire `text`), private `secret`.
const demoLens: Panproto.Lens = { adapters: [{ kind: 'scalar', wire: 'text', echo: ['title'] }] };

class DemoNote extends Type.makeObject<DemoNote>(DXN.make('org.dxos.plugin.atproto.demoNote', '0.1.0'))(
  Schema.Struct({
    title: Schema.String.pipe(AtprotoVisibilityAnnotation.set('publish')),
    secret: Schema.optional(Schema.String),
  }).pipe(
    LabelAnnotation.set(['title']),
    AtprotoRecordAnnotation.set({ collection: NOTE_COLLECTION, rkey: 'tid', lens: demoLens }),
  ),
) {}

type SeedOptions = { connection?: boolean; publication?: 'inSync' | 'outOfDate' };

const makeSeed =
  ({ connection: withConnection = true, publication }: SeedOptions) =>
  ({ client }: { client: Client }) =>
    Effect.gen(function* () {
      yield* initializeIdentity(client);
      const [space] = client.spaces.get();
      yield* Effect.promise(() => space.waitUntilReady());
      const note = space.db.add(Obj.make(DemoNote, { title: 'The Odyssey', secret: 'reading notes' }));

      if (withConnection) {
        const token = space.db.add(
          Obj.make(AccessToken.AccessToken, { source: 'bsky.app', token: 'tok', account: 'alice.test' }),
        );
        const connection = space.db.add(
          Obj.make(Connection.Connection, { name: 'alice.test', connectorId: 'bluesky', accessToken: Ref.make(token) }),
        );
        if (publication) {
          const encoded = yield* Effect.promise(() => Panproto.encode(note, demoLens));
          space.db.add(
            AtprotoPublication.make({
              [Relation.Source]: connection,
              [Relation.Target]: note,
              uri: `at://did:mock:alice/${NOTE_COLLECTION}/self`,
              cid: 'bafyreidemo',
              collection: NOTE_COLLECTION,
              rkey: 'self',
              publishedHash: publication === 'inSync' ? hashRecord(encoded) : 'stale-hash',
              publishedAt: new Date(0).toISOString(),
            }),
          );
        }
      }
      yield* Effect.promise(() => space.db.flush({ indexes: true }));
    });

const Story = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const notes = useQuery(space?.db, Filter.type(DemoNote));
  const note = notes[0];
  if (!note) {
    return <Loading />;
  }
  return <AtprotoCompanion subject={note} role='article' attendableId='story' />;
};

const decorators = (options: SeedOptions) => [
  withLayout({ layout: 'fullscreen' }),
  withPluginManager({
    capabilities: [
      Capability.contributes(AppCapabilities.Translations, translations),
      // Mock repo — no network; publish/unpublish mutate the in-memory store.
      Capability.contributes(AtprotoCapabilities.RepoLayer, () => AtprotoRepo.layerMock()),
    ],
    plugins: [
      ...corePlugins(),
      StorybookPlugin({}),
      ClientPlugin({
        types: [Connection.Connection, AccessToken.AccessToken, AtprotoPublication.AtprotoPublication, DemoNote],
        onClientInitialized: makeSeed(options),
      }),
    ],
  }),
];

const meta = {
  title: 'plugins/plugin-atproto/AtprotoCompanion',
  render: Story,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Story>;

export default meta;

type StoryType = StoryObj<typeof meta>;

export const WithoutConnection: StoryType = { decorators: decorators({ connection: false }) };
export const Unpublished: StoryType = { decorators: decorators({ connection: true }) };
export const Published: StoryType = { decorators: decorators({ connection: true, publication: 'inSync' }) };
export const OutOfDate: StoryType = { decorators: decorators({ connection: true, publication: 'outOfDate' }) };
