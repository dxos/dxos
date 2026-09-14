//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { AiService } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { DXN, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading, withTheme } from '@dxos/react-ui/testing';

import { LingoPlugin } from '#plugin';
import { translations } from '#translations';
import { Language, Vocabulary, Word } from '#types';

import { TEST_PASSAGE, TEST_PASSAGE_TRANSLATION, makeTestDeck } from '../../testing.ts';
import { ReaderArticle } from './ReaderArticle.tsx';

/**
 * A scripted model, so the split view shows a real translation offline.
 *
 * Routed rather than sequential because the reader has more than one model-bearing operation and
 * they share one service; matching on each system prompt keeps a call from consuming another
 * operation's turn. An unmatched call fails loudly, which is what we want — it means an operation
 * reached the model without the story deciding what it should say.
 */
const scriptedAi = ScriptedLanguageModel.scriptedAiService([
  {
    name: 'translate-passage',
    match: ScriptedLanguageModel.promptIncludes('You translate a passage for a language learner'),
    turns: [{ parts: [ScriptedLanguageModel.text(TEST_PASSAGE_TRANSLATION)] }],
  },
  {
    // The tooltip's add action, which is reachable in the story whenever `translateUnknownWords` is
    // on — an unrouted call fails loudly, so the first click on an unknown word broke the story.
    name: 'translate-term',
    match: ScriptedLanguageModel.promptIncludes('You translate a single term for a language learner'),
    turns: [
      {
        parts: [
          ScriptedLanguageModel.text(JSON.stringify([{ term: 'word', translation: 'word', partOfSpeech: 'noun' }])),
        ],
      },
    ],
  },
  {
    // `AnalyzeText` reaches the segmenter, which is a third model-bearing path through this story.
    name: 'segment-text',
    match: ScriptedLanguageModel.promptIncludes('Analyze the passage below and return its structure'),
    turns: [{ parts: [ScriptedLanguageModel.text(JSON.stringify({ paragraphs: [] }))] }],
  },
]);

// LayerSpecs are snapshotted once at boot (see AppCapability.layerSpec), so this rides Startup.
const StoryAiPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.lingoStoryAi'), name: 'Lingo Story AI' }),
).pipe(
  Plugin.addModule({
    id: 'ai-service',
    activatesOn: ActivationEvents.Startup,
    provides: [Capabilities.LayerSpec],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.LayerSpec,
          LayerSpec.make({ affinity: 'space', requires: [], provides: [AiService.AiService] }, () => scriptedAi),
        ),
      ]),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const [space] = useSpaces();
  const [document] = useQuery(space?.db, Filter.type(Markdown.Document));
  const id = document && Obj.getURI(document);
  // In the app the plank carries the attendable attribute; a story renders the article bare, so
  // without this the toolbar never gains attention and stays disabled.
  const attentionAttrs = useAttentionAttributes(id);
  if (!document) {
    return <Loading />;
  }

  return (
    <div className='contents' {...attentionAttrs}>
      <ReaderArticle role='article' attendableId={id} subject={document} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-lingo/containers/ReaderArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Markdown.Document, Language.Language, Vocabulary.Vocabulary, Word.Word],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              // The deck is what the toolbar selects and what the lookup indexes, so the language,
              // the deck and every word have to be in the database before the article mounts.
              const { language, vocabulary, words } = makeTestDeck();
              space.db.add(language);
              space.db.add(vocabulary);
              words.forEach((word) => space.db.add(word));

              const document = Markdown.make({ name: '朝の市場', content: TEST_PASSAGE });
              space.db.add(document.content.target!);
              space.db.add(document);

              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        MarkdownPlugin.make(),
        StoryAiPlugin(),
        LingoPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
