//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { type FC, useCallback } from 'react';

import { ToolId } from '@dxos/ai';
import { EXA_API_KEY } from '@dxos/ai/testing';
import { Capabilities, Surface, useCapabilities } from '@dxos/app-framework';
import { AiContextBinder } from '@dxos/assistant';
import {
  LINEAR_BLUEPRINT,
  RESEARCH_BLUEPRINT,
  ResearchDataTypes,
  ResearchGraph,
  ResearchOn,
  agent,
} from '@dxos/assistant-testing';
import { Blueprint, Prompt, Template } from '@dxos/blueprints';
import { Filter, Obj, Query, Ref, Tag, Type } from '@dxos/echo';
import { FunctionTrigger, ScriptType, exampleFunctions, serializeFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { BLUEPRINT_KEY } from '@dxos/plugin-assistant';
import { useContextBinder } from '@dxos/plugin-assistant';
import { translations } from '@dxos/plugin-assistant';
import { Assistant } from '@dxos/plugin-assistant/types';
import { Board, BoardPlugin } from '@dxos/plugin-board';
import { Chess, ChessPlugin } from '@dxos/plugin-chess';
import * as chessFunctions from '@dxos/plugin-chess/functions';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { Mailbox } from '@dxos/plugin-inbox/types';
import { Map, MapPlugin } from '@dxos/plugin-map';
import { createLocationSchema } from '@dxos/plugin-map/testing';
import { Markdown, MarkdownPlugin } from '@dxos/plugin-markdown';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { ProjectPlugin } from '@dxos/plugin-project';
import { ScriptPlugin, getAccessCredential } from '@dxos/plugin-script';
import { templates } from '@dxos/plugin-script/templates';
import { TablePlugin } from '@dxos/plugin-table';
import { ThreadPlugin } from '@dxos/plugin-thread';
import { TokenManagerPlugin } from '@dxos/plugin-token-manager';
import { TranscriptionPlugin } from '@dxos/plugin-transcription';
import { Transcript } from '@dxos/plugin-transcription/types';
import { useClient } from '@dxos/react-client';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useAsyncEffect, useSignalsMemo } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { Table } from '@dxos/react-ui-table/types';
import { DataType, createView } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';
import { isNonNullable, trim } from '@dxos/util';

import {
  BlueprintContainer,
  ChatContainer,
  ChessContainer,
  CommentsContainer,
  type ComponentProps,
  ExecutionGraphContainer,
  GraphContainer,
  InvocationsContainer,
  MessageContainer,
  ProjectContainer,
  PromptContainer,
  ResearchInputStack,
  ResearchOutputStack,
  ScriptContainer,
  TasksContainer,
  TokenManagerContainer,
  TriggersContainer,
} from '../components';
import {
  ResearchInputQueue,
  accessTokensFromEnv,
  addTestData,
  config,
  createTestMailbox,
  createTestTranscription,
  getDecorators,
  organizations,
  testTypes,
} from '../testing';

const panelClassNames = 'bg-baseSurface rounded border border-separator overflow-hidden mbe-[--stack-gap] last:mbe-0';

type StoryProps = {
  debug?: boolean;
  deckComponents: (FC<ComponentProps> | 'surfaces')[][];
  blueprints?: string[];
};

const DefaultStory = ({ debug = true, deckComponents, blueprints = [] }: StoryProps) => {
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
      itemsCount={deckComponents.length}
      classNames='  absolute inset-0 gap-[--stack-gap]'
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
  title: 'stories/stories-assistant/Chat',
  render: render(DefaultStory),
  decorators: [withTheme],
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
    deckComponents: [[ChatContainer]],
  },
};

export const WithWebSearch: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin()],
    config: config.remote,
  }),
  args: {
    deckComponents: [[ChatContainer]],
    blueprints: ['dxos.org/blueprint/web-search'],
  },
};

// Test with prompt: Propose changes to my document based on the style guide.
export const WithDocument: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin(), ThreadPlugin()],
    config: config.remote, // TODO(burdon): Issue making persistent.
    onInit: async ({ space }) => {
      space.db.add(
        Markdown.makeDocument({
          name: 'My Document',
          content: addSpellingMistakes(MARKDOWN_DOCUMENT, 2),
        }),
      );
      space.db.add(
        Markdown.makeDocument({
          name: 'Style Guide',
          content: STYLE_GUIDE,
        }),
      );
    },
    onChatCreated: async ({ space, binder }) => {
      const { objects } = await space.db.query(Filter.type(Markdown.Document)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
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
    onInit: async ({ space }) => {
      space.db.add(Markdown.makeDocument({ name: 'Tasks' }));
    },
    onChatCreated: async ({ space, binder }) => {
      const { objects } = await space.db.query(Filter.type(Markdown.Document)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
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
    onInit: async ({ space }) => {
      // TODO(burdon): Add player DID (for user and assistant).
      space.db.add(
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
    },
    onChatCreated: async ({ space, binder }) => {
      const { objects } = await space.db.query(Filter.type(Chess.Game)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
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
    onInit: async ({ space }) => {
      const mailbox = space.db.add(Mailbox.make({ name: 'Mailbox', space }));
      const queue = space.queues.get<DataType.Message>(mailbox.queue.dxn);
      const messages = createTestMailbox();
      await queue.append(messages);
    },
    onChatCreated: async ({ space, binder }) => {
      const { objects } = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces', MessageContainer]],
    blueprints: [BLUEPRINT_KEY, 'dxos.org/blueprint/inbox', 'dxos.org/blueprint/markdown'],
  },
};

// Test with prompt: Sync my email.
export const WithGmail: Story = {
  decorators: getDecorators({
    plugins: [InboxPlugin(), TokenManagerPlugin()],
    config: config.remote,
    types: [Mailbox.Mailbox],
    onInit: async ({ space }) => {
      space.db.add(Mailbox.make({ name: 'Mailbox', space }));
    },
    onChatCreated: async ({ space, binder }) => {
      const { objects } = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
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
    onInit: async ({ space }) => {
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
    },
    onChatCreated: async ({ space, binder }) => {
      const { objects } = await space.db.query(Filter.type(DataType.View)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
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
    onInit: async ({ space }) => {
      // TODO(burdon): Table.
      space.db.add(Map.make({ name: 'Trip' }));
      space.db.add(
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
      space.db.add(
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
    },
    onChatCreated: async ({ space, binder }) => {
      const { objects } = await space.db.query(Filter.or(Filter.type(Map.Map), Filter.type(Markdown.Document))).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
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
    onInit: async ({ space }) => {
      space.db.add(Board.makeBoard());
    },
    onChatCreated: async ({ space, binder }) => {
      const { objects } = await space.db.query(Filter.type(Board.Board)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    debug: true,
    deckComponents: [[ChatContainer], ['surfaces']],
  },
};

export const WithResearch: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin(), TablePlugin(), ThreadPlugin()],
    config: config.remote,
    types: [...ResearchDataTypes, ResearchGraph],
    accessTokens: [Obj.make(DataType.AccessToken, { source: 'exa.ai', token: EXA_API_KEY })],
  }),
  args: {
    deckComponents: [[ChatContainer], [GraphContainer, ExecutionGraphContainer]],
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
    onInit: async ({ space }) => {
      const queue = space.queues.create();
      const messages = createTestTranscription();
      await queue.append(messages);
      space.db.add(Transcript.makeTranscript(queue.dxn));
    },
    onChatCreated: async ({ space, binder }) => {
      const { objects } = await space.db.query(Filter.type(Transcript.Transcript)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], ['surfaces']],
    blueprints: [BLUEPRINT_KEY, 'dxos.org/blueprint/transcription'],
  },
};

// TODO(burdon): Move to env.
const VITE_LINEAR_API_KEY = process.env.VITE_LINEAR_API_KEY;

export const WithLinearSync: Story = {
  decorators: getDecorators({
    plugins: [],
    config: config.remote,
    types: [DataType.Task, DataType.Person, DataType.Project],
    accessTokens: accessTokensFromEnv({
      'linear.app': VITE_LINEAR_API_KEY,
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
    onInit: async ({ space }) => {
      space.db.add(
        Obj.make(FunctionTrigger, {
          function: Ref.make(serializeFunction(exampleFunctions.reply)),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '*/5 * * * * *', // Every 5 seconds
          },
        }),
      );
    },
  }),
  args: {
    deckComponents: [[ChatContainer], [TriggersContainer, InvocationsContainer]],
    blueprints: [],
  },
};

export const WithChessTrigger: Story = {
  decorators: getDecorators({
    plugins: [ChessPlugin()],
    config: config.remote,
    types: [Chess.Game],
    onInit: async ({ space }) => {
      // TODO(burdon): Add player DID (for user and assistant).
      space.db.add(
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

      space.db.add(
        Obj.make(FunctionTrigger, {
          function: Ref.make(serializeFunction(chessFunctions.play)),
          enabled: true,
          spec: {
            kind: 'subscription',
            query: {
              ast: Query.select(Filter.type(Chess.Game)).ast,
            },
          },
          input: {
            id: '{{event.changedObjectId}}',
            side: 'black', // NOTE: Removing it makes the bot play itself.
          },
        }),
      );
    },
  }),
  args: {
    deckComponents: [[ChessContainer], [TriggersContainer, InvocationsContainer]],
    blueprints: [],
  },
};

export const WithResearchQueue: Story = {
  decorators: getDecorators({
    plugins: [],
    config: config.remote,
    types: [...ResearchDataTypes, ResearchGraph, ResearchInputQueue],
    accessTokens: [Obj.make(DataType.AccessToken, { source: 'exa.ai', token: EXA_API_KEY })],
    onInit: async ({ space }) => {
      const researchInputQueue = space.db.add(
        Obj.make(ResearchInputQueue, { queue: Ref.fromDXN(space.queues.create().dxn) }),
      );
      const orgs = organizations.map(({ id: _, ...org }) => Obj.make(DataType.Organization, org));
      await researchInputQueue.queue.target!.append(orgs);

      const researchPrompt = space.db.add(
        Prompt.make({
          name: 'Research',
          description: 'Research organization',
          input: Schema.Struct({
            org: Schema.Any,
          }),
          output: Schema.Any,

          instructions:
            'Research the organization provided as input. Create a research note for it at the end. NOTE: Do mocked reseach (set mockSearch to true).',
          blueprints: [Ref.make(RESEARCH_BLUEPRINT)],
        }),
      );

      space.db.add(
        Obj.make(FunctionTrigger, {
          function: Ref.make(serializeFunction(agent)),
          enabled: true,
          spec: {
            kind: 'queue',
            queue: researchInputQueue.queue.dxn.toString(),
          },
          input: {
            prompt: Ref.make(researchPrompt),
            input: '{{event.item}}',
          },
        }),
      );
    },
  }),
  args: {
    deckComponents: [
      [ResearchInputStack, ResearchOutputStack],
      [TriggersContainer, InvocationsContainer, PromptContainer, GraphContainer],
    ],
    blueprints: [RESEARCH_BLUEPRINT.key],
  },
};

export const WithProject: Story = {
  decorators: getDecorators({
    plugins: [InboxPlugin(), MarkdownPlugin(), ProjectPlugin()],
    config: config.remote,
    accessTokens: [Obj.make(DataType.AccessToken, { source: 'exa.ai', token: EXA_API_KEY })],
    types: [
      Tag.Tag,
      DataType.Employer,
      DataType.HasConnection,
      DataType.Message,
      DataType.Organization,
      DataType.Person,
      DataType.Project,
      DataType.View,
      Mailbox.Mailbox,
      ResearchOn,
    ],
    onInit: async ({ space }) => {
      await addTestData(space);
      const { objects: people } = await space.db.query(Filter.type(DataType.Person)).run();
      const { objects: organizations } = await space.db.query(Filter.type(DataType.Organization)).run();
      const tag = space.db.add(Tag.make({ label: 'Project' }));
      const tagDxn = Obj.getDXN(tag).toString();

      people.slice(0, 4).forEach((person) => {
        const meta = Obj.getMeta(person);
        meta.tags = [tagDxn];
      });

      const mailbox = space.db.add(Mailbox.make({ name: 'Mailbox', space }));
      const queue = space.queues.get<DataType.Message>(mailbox.queue.dxn);
      const messages = createTestMailbox(people);
      await queue.append(messages);

      const dxosResearch = space.db.add(
        Markdown.makeDocument({
          name: 'DXOS Research',
          content: 'DXOS builds Composer, an open-source AI-powered malleable application.',
        }),
      );
      const blueyardResearch = space.db.add(
        Markdown.makeDocument({
          name: 'Blue Yard Research',
          content: 'Blue Yard is a venture capital firm that invests in early-stage startups.',
        }),
      );
      [dxosResearch, blueyardResearch].forEach((research) => {
        const meta = Obj.getMeta(research);
        meta.tags = [tagDxn];
      });

      const dxos = organizations.find((org) => org.name === 'DXOS')!;
      const blueyard = organizations.find((org) => org.name === 'Blue Yard')!;
      [dxos, blueyard].forEach((organization) => {
        const meta = Obj.getMeta(organization);
        meta.tags = [tagDxn];
      });
      // TODO(wittjosiah): Support relations.
      // space.db.add(
      //   Relation.make(ResearchOn, {
      //     [Relation.Source]: dxosResearch,
      //     [Relation.Target]: dxos,
      //     completedAt: new Date().toISOString(),
      //   }),
      // );
      // space.db.add(
      //   Relation.make(ResearchOn, {
      //     [Relation.Source]: blueyardResearch,
      //     [Relation.Target]: blueyard,
      //     completedAt: new Date().toISOString(),
      //   }),
      // );

      const contactsQuery = Query.select(Filter.type(DataType.Person)).select(Filter.tag(tagDxn));
      const organizationsQuery = Query.select(Filter.type(DataType.Organization)).select(Filter.tag(tagDxn));
      const notesQuery = Query.select(Filter.type(Markdown.Document)).select(Filter.tag(tagDxn));

      const researchPrompt = space.db.add(
        Prompt.make({
          name: 'Research',
          description: 'Research organization',
          input: Schema.Struct({
            org: Schema.Any,
          }),
          output: Schema.Any,

          instructions:
            'Research the organization provided as input. Absolutely, in all cases, create a research note for it at the end. NOTE: Do mocked reseach (set mockSearch to true).',
          blueprints: [Ref.make(RESEARCH_BLUEPRINT)],
        }),
      );

      const researchTrigger = Obj.make(FunctionTrigger, {
        function: Ref.make(serializeFunction(agent)),
        enabled: true,
        spec: {
          kind: 'subscription',
          query: {
            ast: organizationsQuery.ast,
          },
        },
        input: {
          prompt: Ref.make(researchPrompt),
          input: '{{event.subject}}',
        },
      });
      space.db.add(researchTrigger);

      const mailboxView = createView({
        name: 'Mailbox',
        query: Query.select(Filter.type(DataType.Message))
          .select(Filter.tag(tagDxn))
          .options({
            queues: [mailbox.queue.dxn.toString()],
          }),
        jsonSchema: Type.toJsonSchema(DataType.Message),
        presentation: Obj.make(DataType.Collection, { objects: [] }),
      });
      const contactsView = createView({
        name: 'Contacts',
        query: contactsQuery,
        jsonSchema: Type.toJsonSchema(DataType.Person),
        presentation: Obj.make(DataType.Collection, { objects: [] }),
      });
      const organizationsView = createView({
        name: 'Organizations',
        query: organizationsQuery,
        jsonSchema: Type.toJsonSchema(DataType.Organization),
        presentation: Obj.make(DataType.Collection, { objects: [] }),
      });
      const notesView = createView({
        name: 'Notes',
        query: notesQuery,
        jsonSchema: Type.toJsonSchema(Markdown.Document),
        presentation: Obj.make(DataType.Collection, { objects: [] }),
      });

      space.db.add(
        DataType.makeProject({
          name: 'Investor Research',
          collections: [mailboxView, contactsView, organizationsView, notesView].map((view) => Ref.make(view)),
        }),
      );
    },
  }),
  args: {
    deckComponents: [[ProjectContainer], [TriggersContainer, InvocationsContainer]],
    blueprints: [],
  },
};

export const WithScript: Story = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin(), ScriptPlugin()],
    config: config.local,
    types: [ScriptType, DataType.Text],
    onInit: async ({ client, space }) => {
      const { identityKey } = client.halo.identity.get()!;
      await client.halo.writeCredentials([getAccessCredential(identityKey)]);

      const template = templates.find((template) => template.id === 'dxos.org/script/forex-effect');
      invariant(template, 'Template not found');
      invariant(template.name, 'Template name not found');

      // Ensure at least one Script exists so the React surface can render.
      const source = Obj.make(DataType.Text, {
        content: template.source,
      });
      space.db.add(
        Obj.make(ScriptType, {
          name: template.name,
          description: 'Function to get the exchange rates between two currencies.',
          changed: true,
          source: Ref.make(source),
        }),
      );

      await space.db.flush();
    },
    onChatCreated: async ({ space, binder }) => {
      const bp = space.db.add(
        Blueprint.make({
          key: 'dxos.org/blueprint/forex',
          name: 'Forex',
          instructions: Template.make({
            source: trim`
            You can get the exchange rate between two currencies.
          `,
          }),
          tools: [ToolId.make('dxos.org/script/forex-effect')],
        }),
      );

      await binder.bind({ blueprints: [Ref.make(bp)] });
    },
  }),
  args: {
    deckComponents: [[ChatContainer], [ScriptContainer]],
  },
};
