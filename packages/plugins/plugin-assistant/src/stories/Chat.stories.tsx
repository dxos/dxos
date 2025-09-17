//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, useCallback } from 'react';

import { EXA_API_KEY } from '@dxos/ai/testing';
import { Capabilities, Surface, useCapabilities } from '@dxos/app-framework';
import { AiContextBinder } from '@dxos/assistant';
import { LINEAR_BLUEPRINT, RESEARCH_BLUEPRINT, ResearchDataTypes, ResearchGraph } from '@dxos/assistant-testing';
import { Blueprint } from '@dxos/blueprints';
import { Filter, Obj, Ref } from '@dxos/echo';
import { FunctionTrigger, FunctionType, exampleFunctions, serializeFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { Board, BoardPlugin } from '@dxos/plugin-board';
import { Chess, ChessPlugin } from '@dxos/plugin-chess';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Map, MapPlugin } from '@dxos/plugin-map';
import { createLocationSchema } from '@dxos/plugin-map/testing';
import { Markdown, MarkdownPlugin } from '@dxos/plugin-markdown';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { TablePlugin } from '@dxos/plugin-table';
import { ThreadPlugin } from '@dxos/plugin-thread';
import { TokenManagerPlugin } from '@dxos/plugin-token-manager';
import { TranscriptionPlugin } from '@dxos/plugin-transcription';
import { Transcript } from '@dxos/plugin-transcription/types';
import { useClient } from '@dxos/react-client';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useAsyncEffect, useSignalsMemo } from '@dxos/react-ui';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { Table } from '@dxos/react-ui-table/types';
import { DataType } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';
import { isNonNullable, trim } from '@dxos/util';

import { BLUEPRINT_KEY } from '../capabilities';
import { useContextBinder } from '../hooks';
import { createTestMailbox, createTestTranscription } from '../testing';
import { translations } from '../translations';
import { Assistant } from '../types';

import {
  BlueprintContainer,
  ChatContainer,
  CommentsContainer,
  type ComponentProps,
  GraphContainer,
  LoggingContainer,
  MessageContainer,
  TasksContainer,
  TokenManagerContainer,
} from './components';
import { InvocationsContainer } from './components/InvocationsContainer';
import { TriggersContainer } from './components/TriggersContainer';
import { accessTokensFromEnv, addTestData, config, getDecorators, testTypes } from './testing';

const panelClassNames = 'bg-baseSurface rounded border border-separator overflow-hidden mbe-[--stack-gap] last:mbe-0';

const DefaultStory = ({
  debug = true,
  deckComponents,
  blueprints = [],
}: {
  debug?: boolean;
  deckComponents: (FC<ComponentProps> | 'surfaces')[][];
  blueprints?: string[];
}) => {
  const client = useClient();
  const space = useSpace();

  const blueprintsDefinitions = useCapabilities(Capabilities.BlueprintDefinition);
  useAsyncEffect(async () => {
    if (!space) {
      return;
    }
    const { objects: chats = [] } = await space.db.query(Filter.type(Assistant.Chat)).run();
    const chat = chats[0];
    if (!chat) {
      return;
    }

    // Add blueprints to context.
    const binder = new AiContextBinder(await chat.queue.load());
    const registry = new Blueprint.Registry(blueprintsDefinitions);
    const blueprintObjects = blueprints
      .map((key) => {
        const blueprint = registry.getByKey(key);
        if (blueprint) {
          return space.db.add(Obj.clone(blueprint));
        }
      })
      .filter(isNonNullable);
    await binder.bind({ blueprints: blueprintObjects.map((blueprint) => Ref.make(blueprint)) });
  }, [space, blueprints, blueprintsDefinitions]);

  const handleEvent = useCallback<NonNullable<ComponentProps['onEvent']>>((event) => {
    log.info('event', { event });
    switch (event) {
      case 'reset': {
        void client?.reset().then(() => {
          document.location.reload();
        });
        break;
      }
    }
  }, []);

  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const binder = useContextBinder(chats.at(-1));
  const objects = useSignalsMemo(
    () => binder?.objects.value.map((ref) => ref.target).filter(isNonNullable) ?? [],
    [binder],
  );

  if (!space) {
    return null;
  }

  return (
    <Stack
      orientation='horizontal'
      size='split'
      rail={false}
      classNames='absolute inset-0 gap-[--stack-gap]'
      itemsCount={deckComponents.length}
    >
      {deckComponents.map((plankComponents, i) => {
        const Components: FC<ComponentProps>[] = plankComponents.filter((item) => item !== 'surfaces');
        const renderSurfaces = plankComponents.includes('surfaces');
        let j = 0;
        return (
          <StackItem.Root order={i + 1} item={{ id: `${i}` }} key={i}>
            <Stack
              orientation='vertical'
              size={i > 0 ? 'contain' : 'split'}
              rail={false}
              itemsCount={plankComponents.length + (i > 0 ? objects.length : 0)}
            >
              {Components.map((Component) => {
                const item = (
                  <StackItem.Root key={j} order={j + 1} item={{ id: `${i}:${j}` }} classNames={panelClassNames}>
                    <Component space={space} debug={debug} onEvent={handleEvent} />
                  </StackItem.Root>
                );
                j += 1;
                return item;
              })}
              {renderSurfaces &&
                objects.map((object, index) => {
                  const k = index + j;
                  return (
                    <StackItem.Root key={k} order={k + 1} item={{ id: `${k}` }} classNames={panelClassNames}>
                      {debug && (
                        <div role='heading' className='flex gap-2 items-center text-xs justify-center text-subdued'>
                          <span>{Obj.getTypename(object)}</span>
                          <span>{object.id}</span>
                        </div>
                      )}
                      <Surface role='section' limit={1} data={{ subject: object }} />
                    </StackItem.Root>
                  );
                })}
            </Stack>
          </StackItem.Root>
        );
      })}
    </Stack>
  );
};

const storybook: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/Chat',
  render: render(DefaultStory),
  parameters: {
    translations,
    controls: { disable: true },
  },
};

export default storybook;

type Story = StoryObj<typeof storybook>;

//
// Stories
//

const MARKDOWN_DOCUMENT = trim`
  # Hello, world!

  This is a test document that contains Markdown content. Markdown is a lightweight markup language for writing formatted text in plain text form. Its goal is to be easy to read and write in raw form, easy to convert to HTML.

  Markdown’s simplicity makes it highly adaptable: it can be written in any text editor, stored in plain .md files, and rendered into HTML, PDF, or other formats with converters. Because of this portability, it’s widely used in software documentation, static site generators, technical blogging, and collaborative platforms like GitHub and Notion. 

  Many applications extend the core syntax with extras (e.g., tables, task lists, math notation), but the core idea remains the same—clean, minimal markup that stays readable even without rendering.
`;

const STYLE_GUIDE = trim`
  # Style Guide
  - Use short, simple sentences.
  - Organize content with headings and bullet points.
  - Avoid jargon and explain technical terms.
  - Use active voice whenever possible.
  - Highlight key points in bold.
  - Keep paragraphs brief and focused on one idea.
  - Proofread for clarity and correctness.
`;

const addSpellingMistakes = (text: string, n: number): string => {
  const words = text.split(' ');
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * words.length);
    const word = words[idx];
    const charIdx = Math.floor(Math.random() * word.length);
    const typoChar = String.fromCharCode(word.charCodeAt(charIdx) + 1);
    words[idx] = word.slice(0, charIdx) + typoChar + word.slice(charIdx + 1);
  }

  return words.join(' ');
};

export const Default: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin()],
    config: config.remote,
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces']],
  },
};

// Test with prompt: Propose changes to my document based on the style guide.
export const WithDocument: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin(), ThreadPlugin()],
    config: config.remote, // TODO(burdon): Issue making persistent.
    onInit: async ({ space, binder }) => {
      const doc = space.db.add(
        Markdown.makeDocument({
          name: 'My Document',
          content: addSpellingMistakes(MARKDOWN_DOCUMENT, 2),
        }),
      );
      const styleGuide = space.db.add(
        Markdown.makeDocument({
          name: 'Style Guide',
          content: STYLE_GUIDE,
        }),
      );
      await binder.bind({ objects: [Ref.make(doc), Ref.make(styleGuide)] });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces', CommentsContainer]],
    blueprints: [BLUEPRINT_KEY, 'dxos.org/blueprint/markdown'],
  },
};

export const WithBlueprints: Story = {
  decorators: getDecorators({
    plugins: [InboxPlugin(), MarkdownPlugin(), TablePlugin()],
    config: config.remote,
    onInit: async ({ space, binder }) => {
      const object = space.db.add(Markdown.makeDocument({ name: 'Tasks' }));
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], [TasksContainer, BlueprintContainer]],
  },
};

export const WithChess: Story = {
  decorators: getDecorators({
    plugins: [ChessPlugin()],
    config: config.remote,
    types: [Chess.Game],
    onInit: async ({ space, binder }) => {
      // TODO(burdon): Add player DID (for user and assistant).
      const object = space.db.add(
        Chess.makeGame({
          name: 'Challenge',
          pgn: [
            '1. e4 e5',
            '2. Nf3 Nc6',
            '3. Bc4 Bc5',
            '4. c3 Nf6',
            '5. d4 exd4',
            '6. cxd4 Bb4+',
            '7. Nc3 d5',
            '8. exd5 Nxd5',
            '9. O-O Be6',
            '10. Qb3 Na5',
            '11. Qa4+ c6',
            '12. Bxd5 Bxc3',
            '13. Bxe6 fxe6',
            '*',
          ].join(' '),
        }),
      );
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces']],
    blueprints: [BLUEPRINT_KEY, 'dxos.org/blueprint/chess'],
  },
};

// Test with prompt: Summarize my mailbox and write the summary in a new document.
export const WithMail: Story = {
  decorators: getDecorators({
    plugins: [InboxPlugin(), MarkdownPlugin(), ThreadPlugin()],
    config: config.remote,
    types: [Mailbox.Mailbox],
    onInit: async ({ space, binder }) => {
      const queue = space.queues.create();
      const messages = createTestMailbox();
      await queue.append(messages);
      const mailbox = space.db.add(Mailbox.make({ name: 'Mailbox', queue: queue.dxn }));
      await binder.bind({ objects: [Ref.make(mailbox)] });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces', MessageContainer]],
    blueprints: [BLUEPRINT_KEY, 'dxos.org/blueprint/inbox'],
  },
};

export const WithGmail: Story = {
  decorators: getDecorators({
    plugins: [InboxPlugin(), TokenManagerPlugin()],
    config: config.remote,
    types: [Mailbox.Mailbox],
    onInit: async ({ space, binder }) => {
      const queue = space.queues.create();
      const mailbox = space.db.add(Mailbox.make({ name: 'Mailbox', queue: queue.dxn }));
      await binder.bind({ objects: [Ref.make(mailbox)] });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces', MessageContainer, TokenManagerContainer]],
    blueprints: [BLUEPRINT_KEY, 'dxos.org/blueprint/inbox'],
  },
};

// Test with prompt: Create 10 locations.
export const WithMap: Story = {
  decorators: getDecorators({
    plugins: [MapPlugin(), TablePlugin()],
    config: config.remote,
    types: [DataType.View, Map.Map, Table.Table],
    onInit: async ({ space, binder }) => {
      const [schema] = await space.db.schemaRegistry.register([createLocationSchema()]);
      const { view: tableView } = await Table.makeView({ name: 'Table', space, typename: schema.typename });
      const { view: mapView } = await Map.makeView({
        name: 'Map',
        space,
        typename: schema.typename,
        pivotFieldName: 'location',
      });
      space.db.add(tableView);
      space.db.add(mapView);
      await binder.bind({ objects: [Ref.make(tableView), Ref.make(mapView)] });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces']],
    blueprints: [BLUEPRINT_KEY, 'dxos.org/blueprint/map'],
  },
};

export const WithTrip: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin(), MapPlugin()],
    config: config.remote,
    types: [Map.Map],
    onInit: async ({ space, binder }) => {
      // TODO(burdon): Table.
      {
        const object = space.db.add(Map.make({ name: 'Trip' }));
        await binder.bind({ objects: [Ref.make(object)] });
      }
      {
        const object = space.db.add(
          Markdown.makeDocument({
            name: 'Itinerary',
            content: trim`
              # Itinerary

              ## Day 1
              - Visit the Sagrada Familia
              - Visit the Park Güell
              - Visit the Casa Batlló

              ## Day 2
              - Visit the Eiffel Tower
              - Visit the Louvre
              - Visit the Musée d'Orsay
            `,
          }),
        );
        await binder.bind({ objects: [Ref.make(object)] });
      }
      {
        const object = space.db.add(
          Markdown.makeDocument({
            name: 'Barcelona',
            content: trim`
              # Barcelona

              Barcelona is the capital and most populous city of Catalonia, an autonomous community in northeastern Spain. 
              It is located on the Mediterranean coast, on the banks of the Llobregat River, in the comarca of the Baix Llobregat. 
              The city is known for its rich history, vibrant culture, and stunning architecture, including the Sagrada Familia, Park Güell, and Casa Batlló.
            `,
          }),
        );
        await binder.bind({ objects: [Ref.make(object)] });
      }
    },
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces']],
  },
};

export const WithBoard: Story = {
  decorators: getDecorators({
    plugins: [BoardPlugin()],
    config: config.remote,
    types: [Board.Board],
    onInit: async ({ space, binder }) => {
      const object = space.db.add(Board.makeBoard());
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    debug: true,
    deckComponents: [[ChatContainer], ['surfaces']],
  },
};

export const WithResearch: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin(), TablePlugin()],
    config: config.persistent,
    types: [...ResearchDataTypes, ResearchGraph],
    accessTokens: [Obj.make(DataType.AccessToken, { source: 'exa.ai', token: EXA_API_KEY })],
  }),
  args: {
    deckComponents: [[ChatContainer], [GraphContainer, LoggingContainer]],
    blueprints: [RESEARCH_BLUEPRINT.key],
  },
};

export const WithSearch: Story = {
  decorators: getDecorators({
    config: config.remote,
    types: testTypes,
    onInit: async ({ space }) => {
      await addTestData(space);
    },
  }),
  args: {
    deckComponents: [[ChatContainer], [GraphContainer]],
  },
};

export const WithTranscription: Story = {
  decorators: getDecorators({
    plugins: [TranscriptionPlugin(), PreviewPlugin()],
    config: config.remote,
    types: [Transcript.Transcript],
    onInit: async ({ space, binder }) => {
      const queue = space.queues.create();
      const messages = createTestTranscription();
      await queue.append(messages);
      const transcript = space.db.add(Transcript.makeTranscript(queue.dxn));
      await binder.bind({ objects: [Ref.make(transcript)] });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces']],
    blueprints: [BLUEPRINT_KEY, 'dxos.org/blueprint/transcription'],
  },
};

export const WithLinearSync: Story = {
  decorators: getDecorators({
    plugins: [],
    config: config.remote,
    types: [DataType.Task, DataType.Person, DataType.Project],
    accessTokens: accessTokensFromEnv({
      'linear.app': import.meta.env.VITE_LINEAR_API_KEY,
    }),
  }),
  args: {
    deckComponents: [[ChatContainer], [GraphContainer]],
    blueprints: [LINEAR_BLUEPRINT.key],
  },
};

export const WithTriggers: Story = {
  decorators: getDecorators({
    plugins: [],
    config: config.remote,
    types: [FunctionType, FunctionTrigger],
    onInit: async ({ space, binder }) => {
      const functionObj = serializeFunction(exampleFunctions.reply);
      space.db.add(functionObj);
      const object = space.db.add(
        Obj.make(FunctionTrigger, {
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '*/5 * * * * *', // Every 5 seconds
          },
        }),
      );
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], [TriggersContainer, InvocationsContainer]],
    blueprints: [],
  },
};
