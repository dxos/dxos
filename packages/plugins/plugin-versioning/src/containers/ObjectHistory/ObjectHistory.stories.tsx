//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { DXN, Obj, Query, Ref, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { translations as spaceTranslations } from '@dxos/plugin-space/translations';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Branch, History, Version } from '@dxos/versioning';

import { translations } from '#translations';
import { VersioningCapabilities } from '#types';

import { VersioningPlugin } from '../../plugin';
import { ObjectHistory } from './ObjectHistory';

/**
 * Minimal versioned host: any object holding a root Text and a history qualifies — the panel is
 * markdown-agnostic, gated only by a per-typename HistoryProvider contribution.
 */
const TestDoc = Type.makeObject(DXN.make('org.dxos.test.versioning.Doc', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
    history: History.History.pipe(Schema.optional),
  }),
);

const BRANCH_KEY = 'story-draft';

/** Contributes the HistoryProvider that gates the panel for the story's test type. */
const HistoryProviderPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.versioning.story.historyProvider'),
    name: 'Story HistoryProvider',
  }),
).pipe(
  Plugin.addModule({
    id: 'history-provider',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: () =>
      Effect.succeed(
        Capability.contributes(VersioningCapabilities.HistoryProvider, {
          id: Type.getTypename(TestDoc),
          getTarget: (object) => (Obj.instanceOf(TestDoc, object) ? object.content.target : undefined),
        }),
      ),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(TestDoc));
  if (!doc) {
    return <Loading />;
  }

  return (
    <div className='is-[24rem] bs-full mli-auto border-is border-ie border-separator'>
      <ObjectHistory role='article' attendableId={doc.id} subject={doc} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-versioning/ObjectHistory',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager(() => ({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [TestDoc, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client, { displayName: 'Alice Mercer' });
              const text = Text.make({ content: 'alpha\n' });
              const doc = personalSpace.db.add(Obj.make(TestDoc, { name: 'Story', content: Ref.make(text) }));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));

              // Real checkpoints (valid heads) between edits, so each lands on a distinct revision;
              // the branch is a static record — enough for the timeline graph, no live registry.
              const root = yield* Effect.promise(() => doc.content.load());
              Version.create(doc, { name: 'First draft', target: root });
              Obj.update(root, (root) => {
                root.content = 'alpha\nbravo\n';
              });
              Version.create(doc, { name: 'Second draft', target: root });
              Obj.update(doc, () => {
                History.ensure(doc).branches.push(
                  Branch.make({ name: 'draft', key: BRANCH_KEY, parent: Ref.make(root), anchor: [] }),
                );
              });
              Obj.update(root, (root) => {
                root.content = 'alpha\nbravo\ncharlie\n';
              });
              Version.create(doc, { name: 'Branch revision', target: root, branch: BRANCH_KEY });
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        VersioningPlugin(),
        HistoryProviderPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...spaceTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Static history graph: two checkpoints on main and one branch with its own revision — the panel's
 * timeline, lane highlighting, and selection affordances without any markdown involvement.
 */
export const Default: Story = {};
