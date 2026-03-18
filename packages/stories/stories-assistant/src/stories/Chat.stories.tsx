//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { ToolId } from '@dxos/ai';
import { EXA_API_KEY } from '@dxos/ai/testing';
import {
  AgentFunctions,
  LinearBlueprint,
  MarkdownBlueprint,
  ResearchBlueprint,
  ResearchDataTypes,
  ResearchGraph,
  WebSearchBlueprint,
} from '@dxos/assistant-toolkit';
import { Blueprint, Prompt, Template } from '@dxos/blueprints';
import { Feed, Filter, JsonSchema, Obj, Query, Ref, Tag } from '@dxos/echo';
import { View } from '@dxos/echo';
import { ExampleFunctions, Script, Trigger, serializeFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { AssistantBlueprint, translations } from '@dxos/plugin-assistant';
import { ChessBlueprint, ChessFunctions } from '@dxos/plugin-chess/blueprints';
import { CalendarBlueprint, InboxBlueprint } from '@dxos/plugin-inbox/blueprints';
import { Calendar, Mailbox } from '@dxos/plugin-inbox/types';
import { MapBlueprint } from '@dxos/plugin-map/blueprints';
import { Markdown } from '@dxos/plugin-markdown/types';
import { ThreadBlueprint } from '@dxos/plugin-thread/blueprints';
import { TranscriptionBlueprint } from '@dxos/plugin-transcription/blueprints';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text, ViewModel } from '@dxos/schema';
import {
  AccessToken,
  Employer,
  Event,
  HasConnection,
  HasSubject,
  Message,
  Organization,
  Person,
  Pipeline,
  Task,
  Transcript,
} from '@dxos/types';
import { trim } from '@dxos/util';

import {
  BlueprintModule,
  ChatModule,
  ChessModule,
  CommentsModule,
  ExecutionGraphModule,
  GraphModule,
  InboxModule,
  InvocationsModule,
  ProjectModule,
  PromptModule,
  ResearchInputModule,
  ResearchOutputModule,
  ScriptModule,
  TasksModule,
  TokenManagerModule,
  TriggersModule,
} from '../components';
import {
  ModuleContainer,
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

const storybook: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Chat',
  render: ModuleContainer,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default storybook;

type Story = StoryObj<typeof storybook>;

//
// Stories
//

const MARKDOWN_DOCUMENT = trim`
  # Hello, world!

  This is a test document that contains Markdown content.
  Markdown is a lightweight markup language for writing formatted text in plain text form.
  Its goal is to be easy to read and write in raw form, easy to convert to HTML.

  Markdown’s simplicity makes it highly adaptable: it can be written in any text editor, stored in plain .md files, and rendered into HTML, PDF, or other formats with converters.
  Because of this portability, it’s widely used in software documentation, static site generators, technical blogging, and collaborative platforms like GitHub and Notion.

  Many applications extend the core syntax with extras (e.g., tables, task lists, math notation), but the core idea remains the same—clean, minimal markup that stays readable even without rendering.
`;

const DXOS_DOCUMENT = trim`
  # DXOS
  - ECHO Semantic Graph Database
  - AI-Native workflows
  - Privacy preserving P2P sync
  - Edge computing
  - Flexible access control
  - Open and extensible
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
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown');
      return { plugins: [MarkdownPlugin()] };
    },
    config: config.remote,
  }),
  args: {
    modules: [[ChatModule]],
  },
};

export const WithWebSearch: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown');
      return { plugins: [MarkdownPlugin()] };
    },
    config: config.remote,
  }),
  args: {
    modules: [[ChatModule]],
    blueprints: [WebSearchBlueprint.key],
  },
};

// Test with prompt: Propose changes to my document based on the style guide.
export const WithDocument: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ MarkdownPlugin }, { ThreadPlugin }] = await Promise.all([
        import('@dxos/plugin-markdown'),
        import('@dxos/plugin-thread'),
      ]);
      return { plugins: [MarkdownPlugin(), ThreadPlugin()] };
    },
    config: config.remote, // TODO(burdon): Issue making persistent.
    onInit: async ({ space }) => {
      space.db.add(
        Markdown.make({
          name: 'My Document',
          content: addSpellingMistakes(MARKDOWN_DOCUMENT, 2),
        }),
      );
      space.db.add(
        Markdown.make({
          name: 'Style Guide',
          content: STYLE_GUIDE,
        }),
      );
    },
    onChatCreated: async ({ space, binder }) => {
      const objects = await space.db.query(Filter.type(Markdown.Document)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule], [CommentsModule]],
    blueprints: [AssistantBlueprint.key, MarkdownBlueprint.key, ThreadBlueprint.key],
  },
};

export const WithBlueprints: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { MarkdownPlugin }, { TablePlugin }] = await Promise.all([
        import('@dxos/plugin-inbox'),
        import('@dxos/plugin-markdown'),
        import('@dxos/plugin-table'),
      ]);
      return { plugins: [InboxPlugin(), MarkdownPlugin(), TablePlugin()] };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      space.db.add(Markdown.make({ name: 'Tasks' }));
    },
    onChatCreated: async ({ space, binder }) => {
      const objects = await space.db.query(Filter.type(Markdown.Document)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    modules: [[ChatModule], [TasksModule, BlueprintModule]],
  },
};

export const WithChess: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const { Chess, ChessPlugin } = await import('@dxos/plugin-chess');
      return { plugins: [ChessPlugin()], types: [Chess.Game] };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const { Chess } = await import('@dxos/plugin-chess');
      // TODO(burdon): Add player DID (for user and assistant).
      space.db.add(
        Chess.make({
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
      const { Chess } = await import('@dxos/plugin-chess');
      const objects = await space.db.query(Filter.type(Chess.Game)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule]],
    blueprints: [AssistantBlueprint.key, ChessBlueprint.key],
  },
};

// Test with prompt: Summarize my mailbox and write the summary in a new document.
export const WithMail: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { MarkdownPlugin }, { ThreadPlugin }] = await Promise.all([
        import('@dxos/plugin-inbox'),
        import('@dxos/plugin-markdown'),
        import('@dxos/plugin-thread'),
      ]);
      return { plugins: [InboxPlugin(), MarkdownPlugin(), ThreadPlugin()] };
    },
    config: config.remote,
    types: [Feed.Feed, Mailbox.Mailbox],
    onInit: async ({ space }) => {
      const mailbox = space.db.add(Mailbox.make({ name: 'Mailbox' }));
      const feed = await mailbox.feed?.tryLoad();
      invariant(feed);
      const queue = space.queues.create<Message.Message>();
      Obj.change(feed, (mutable) => {
        Obj.getMeta(mutable).keys.push({ source: Feed.DXN_KEY, id: queue.dxn.toString() });
      });
      const messages = createTestMailbox();
      await queue.append(messages);
    },
    onChatCreated: async ({ space, binder }) => {
      const mailboxes = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
      const mailbox = mailboxes[0];
      if (mailbox) {
        await binder.bind({ objects: [Ref.make(mailbox)] });
      }
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule]],
    blueprints: [AssistantBlueprint.key, MarkdownBlueprint.key, InboxBlueprint.key],
  },
};

// Test with prompt: Sync my email.
export const WithGmail: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { TokenManagerPlugin }] = await Promise.all([
        import('@dxos/plugin-inbox'),
        import('@dxos/plugin-token-manager'),
      ]);
      return { plugins: [InboxPlugin(), TokenManagerPlugin()] };
    },
    config: config.persistent,
    types: [Feed.Feed, Mailbox.Mailbox],
    onInit: async ({ space }) => {
      space.db.add(Mailbox.make({ name: 'Mailbox' }));
    },
    onChatCreated: async ({ space, binder }) => {
      const mailboxes = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
      const mailbox = mailboxes[0];
      if (mailbox) {
        await binder.bind({ objects: [Ref.make(mailbox)] });
      }
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule], [InboxModule, TokenManagerModule]],
    blueprints: [AssistantBlueprint.key, InboxBlueprint.key],
  },
};

// Test with prompt: Sync my calendar.
export const WithCalendar: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { TokenManagerPlugin }] = await Promise.all([
        import('@dxos/plugin-inbox'),
        import('@dxos/plugin-token-manager'),
      ]);
      return { plugins: [InboxPlugin(), TokenManagerPlugin()] };
    },
    config: config.remote,
    types: [Feed.Feed, Calendar.Calendar, Event.Event],
    onInit: async ({ space }) => {
      space.db.add(Calendar.make({ name: 'Calendar' }));
    },
    onChatCreated: async ({ space, binder }) => {
      const calendars = await space.db.query(Filter.type(Calendar.Calendar)).run();
      const calendar = calendars[0];
      if (calendar) {
        await binder.bind({ objects: [Ref.make(calendar)] });
      }
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule], [TokenManagerModule]],
    blueprints: [AssistantBlueprint.key, CalendarBlueprint.key],
  },
};

// Test with prompt: Create 10 locations.
export const WithMap: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ Map, MapPlugin }, { TablePlugin }, { Table }, { createLocationSchema: _ }] = await Promise.all([
        import('@dxos/plugin-map'),
        import('@dxos/plugin-table'),
        import('@dxos/react-ui-table/types'),
        import('@dxos/plugin-map/testing'),
      ]);
      return { plugins: [MapPlugin(), TablePlugin()], types: [View.View, Map.Map, Table.Table] };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const [{ Map, MapPlugin: _ }, { Table }, { createLocationSchema }] = await Promise.all([
        import('@dxos/plugin-map'),
        import('@dxos/react-ui-table/types'),
        import('@dxos/plugin-map/testing'),
      ]);
      const [schema] = await space.db.schemaRegistry.register([createLocationSchema()]);
      const { view: tableView, jsonSchema } = await ViewModel.makeFromDatabase({
        db: space.db,
        typename: schema.typename,
      });
      const table = Table.make({ name: 'Table', view: tableView, jsonSchema });
      const { view: mapView } = await ViewModel.makeFromDatabase({
        db: space.db,
        typename: schema.typename,
        pivotFieldName: 'location',
      });
      const map = Map.make({ name: 'Map', view: mapView });
      space.db.add(table);
      space.db.add(map);
    },
    onChatCreated: async ({ space, binder }) => {
      const objects = await space.db.query(Filter.type(View.View)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule]],
    blueprints: [AssistantBlueprint.key, MapBlueprint.key],
  },
};

export const WithTrip: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ MarkdownPlugin }, { Map, MapPlugin }] = await Promise.all([
        import('@dxos/plugin-markdown'),
        import('@dxos/plugin-map'),
      ]);
      return { plugins: [MarkdownPlugin(), MapPlugin()], types: [Map.Map] };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const { Map } = await import('@dxos/plugin-map');
      // TODO(burdon): Table.
      const map = Map.make({ name: 'Trip' });
      space.db.add(map);
      space.db.add(
        Markdown.make({
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
        Markdown.make({
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
      const { Map } = await import('@dxos/plugin-map');
      const objects = await space.db.query(Filter.or(Filter.type(Map.Map), Filter.type(Markdown.Document))).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule]],
  },
};

export const WithBoard: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const { Board, BoardPlugin } = await import('@dxos/plugin-board');
      return { plugins: [BoardPlugin()], types: [Board.Board] };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const { Board } = await import('@dxos/plugin-board');
      space.db.add(Board.makeBoard());
    },
    onChatCreated: async ({ space, binder }) => {
      const { Board } = await import('@dxos/plugin-board');
      const objects = await space.db.query(Filter.type(Board.Board)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule]],
  },
};

/**
 * PROMPT: "Create a research note for the organization."
 */
export const WithResearch: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ MarkdownPlugin }, { TablePlugin }, { ThreadPlugin }] = await Promise.all([
        import('@dxos/plugin-markdown'),
        import('@dxos/plugin-table'),
        import('@dxos/plugin-thread'),
      ]);
      return { plugins: [MarkdownPlugin(), TablePlugin(), ThreadPlugin()] };
    },
    config: config.remote,
    types: [...ResearchDataTypes, ResearchGraph.ResearchGraph],
    accessTokens: [Obj.make(AccessToken.AccessToken, { source: 'exa.ai', token: EXA_API_KEY })],
    onInit: async ({ space }) => {
      space.db.add(Obj.make(Organization.Organization, { name: 'BlueYard Capital' }));
      space.db.add(Markdown.make({ name: 'DXOS', content: DXOS_DOCUMENT }));
    },
    onChatCreated: async ({ space, binder }) => {
      const organizations = await space.db.query(Filter.type(Organization.Organization)).run();
      const documents = await space.db.query(Filter.type(Markdown.Document)).run();
      await binder.bind({ objects: [...organizations, ...documents].map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule], [GraphModule, ExecutionGraphModule]],
    blueprints: [
      // AssistantBlueprint.key
      // TODO(burdon): Too many open-ended tools (querying for tools, querying for schema) confuses the model.
      ResearchBlueprint.key,
    ],
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
    modules: [[ChatModule], [GraphModule]],
  },
};

export const WithTranscription: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ TranscriptionPlugin }, { PreviewPlugin }] = await Promise.all([
        import('@dxos/plugin-transcription'),
        import('@dxos/plugin-preview'),
      ]);
      return { plugins: [TranscriptionPlugin(), PreviewPlugin()] };
    },
    config: config.remote,
    types: [Transcript.Transcript],
    onInit: async ({ space }) => {
      const queue = space.queues.create();
      const messages = createTestTranscription();
      await queue.append(messages);
      space.db.add(Transcript.make(queue.dxn));
    },
    onChatCreated: async ({ space, binder }) => {
      const objects = await space.db.query(Filter.type(Transcript.Transcript)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    modules: [[ChatModule]],
    blueprints: [AssistantBlueprint.key, TranscriptionBlueprint.key],
  },
};

// TODO(burdon): Move to env.
const VITE_LINEAR_API_KEY = process.env.VITE_LINEAR_API_KEY;

export const WithLinearSync: Story = {
  decorators: getDecorators({
    plugins: [],
    config: config.remote,
    types: [Task.Task, Person.Person, Pipeline.Pipeline],
    accessTokens: accessTokensFromEnv({
      'linear.app': VITE_LINEAR_API_KEY,
    }),
  }),
  args: {
    modules: [[ChatModule], [GraphModule]],
    blueprints: [LinearBlueprint.key],
  },
};

export const WithTriggers: Story = {
  decorators: getDecorators({
    plugins: [],
    config: config.remote,
    onInit: async ({ space }) => {
      space.db.add(
        Trigger.make({
          function: Ref.make(serializeFunction(ExampleFunctions.Reply)),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '*/5 * * * * *', // Every 5 seconds.
          },
        }),
      );
    },
  }),
  args: {
    modules: [[ChatModule], [TriggersModule, InvocationsModule]],
    blueprints: [],
  },
};

export const WithChessTrigger: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const { Chess, ChessPlugin } = await import('@dxos/plugin-chess');
      return { plugins: [ChessPlugin()], types: [Chess.Game] };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const { Chess } = await import('@dxos/plugin-chess');
      // TODO(burdon): Add player DID (for user and assistant).
      space.db.add(
        Chess.make({
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
        Trigger.make({
          function: Ref.make(serializeFunction(ChessFunctions.Play)),
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
    modules: [[ChessModule], [TriggersModule, InvocationsModule]],
    blueprints: [],
  },
};

export const WithResearchQueue: Story = {
  decorators: getDecorators({
    plugins: [],
    config: config.remote,
    types: [...ResearchDataTypes, ResearchGraph.ResearchGraph, ResearchInputQueue],
    accessTokens: [Obj.make(AccessToken.AccessToken, { source: 'exa.ai', token: EXA_API_KEY })],
    onInit: async ({ space }) => {
      const researchInputQueue = space.db.add(
        Obj.make(ResearchInputQueue, { queue: Ref.fromDXN(space.queues.create().dxn) }),
      );
      const orgs = organizations.map(({ id: _, ...org }) => Obj.make(Organization.Organization, org));
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
          blueprints: [Ref.make(ResearchBlueprint.make())],
        }),
      );

      space.db.add(
        Trigger.make({
          function: Ref.make(serializeFunction(AgentFunctions.Prompt)),
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
    modules: [
      [ResearchInputModule, ResearchOutputModule],
      [TriggersModule, InvocationsModule, PromptModule, GraphModule],
    ],
    blueprints: [ResearchBlueprint.key],
  },
};

export const WithProject: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { MarkdownPlugin }, { PipelinePlugin }] = await Promise.all([
        import('@dxos/plugin-inbox'),
        import('@dxos/plugin-markdown'),
        import('@dxos/plugin-pipeline'),
      ]);
      return { plugins: [InboxPlugin(), MarkdownPlugin(), PipelinePlugin()] };
    },
    config: config.remote,
    accessTokens: [Obj.make(AccessToken.AccessToken, { source: 'exa.ai', token: EXA_API_KEY })],
    types: [
      Tag.Tag,
      Employer.Employer,
      HasConnection.HasConnection,
      HasSubject.HasSubject,
      Message.Message,
      Organization.Organization,
      Person.Person,
      Pipeline.Pipeline,
      View.View,
      Feed.Feed,
    ],
    onInit: async ({ space }) => {
      await addTestData(space);
      const people = await space.db.query(Filter.type(Person.Person)).run();
      const organizations = await space.db.query(Filter.type(Organization.Organization)).run();
      const tag = space.db.add(Tag.make({ label: 'Project' }));
      const tagDxn = Obj.getDXN(tag).toString();

      people.slice(0, 4).forEach((person) => {
        Obj.change(person, (p) => {
          Obj.getMeta(p).tags = [tagDxn];
        });
      });

      const mailbox = space.db.add(Mailbox.make({ name: 'Mailbox' }));
      const queue = space.queues.create<Message.Message>();
      Obj.change(mailbox, (mutable) => {
        Obj.getMeta(mutable).keys.push({ source: Feed.DXN_KEY, id: queue.dxn.toString() });
      });
      const messages = createTestMailbox(people);
      await queue.append(messages);

      const dxosResearch = space.db.add(
        Markdown.make({
          name: 'DXOS Research',
          content: 'DXOS builds Composer, an open-source AI-powered malleable application.',
        }),
      );
      const blueyardResearch = space.db.add(
        Markdown.make({
          name: 'BlueYard Research',
          content: 'BlueYard is a venture capital firm that invests in early-stage startups.',
        }),
      );
      [dxosResearch, blueyardResearch].forEach((research) => {
        Obj.change(research, (r) => {
          Obj.getMeta(r).tags = [tagDxn];
        });
      });

      const dxos = organizations.find((org) => org.name === 'DXOS')!;
      const blueyard = organizations.find((org) => org.name === 'BlueYard')!;
      [dxos, blueyard].forEach((organization) => {
        Obj.change(organization, (org) => {
          Obj.getMeta(org).tags = [tagDxn];
        });
      });
      // TODO(wittjosiah): Support relations.
      // space.db.add(
      //   Relation.make(HasSubject, {
      //     [Relation.Source]: dxosResearch,
      //     [Relation.Target]: dxos,
      //     completedAt: new Date().toISOString(),
      //   }),
      // );
      // space.db.add(
      //   Relation.make(HasSubject, {
      //     [Relation.Source]: blueyardResearch,
      //     [Relation.Target]: blueyard,
      //     completedAt: new Date().toISOString(),
      //   }),
      // );

      const contactsQuery = Query.select(Filter.type(Person.Person)).select(Filter.tag(tagDxn));
      const organizationsQuery = Query.select(Filter.type(Organization.Organization)).select(Filter.tag(tagDxn));
      const notesQuery = Query.select(Filter.type(Markdown.Document)).select(Filter.tag(tagDxn));

      const researchPrompt = space.db.add(
        Prompt.make({
          name: 'Research',
          description: 'Research organization',
          input: Schema.Struct({
            organization: Schema.Any,
          }),
          output: Schema.Any,
          instructions: trim`
            Research the organization provided as input.
            Absolutely, in all cases, create a research note for it at the end.
            NOTE: Do mocked reseach (set mockSearch to true).

            {{organization}}
          `,
          blueprints: [Ref.make(ResearchBlueprint.make())],
        }),
      );

      const researchTrigger = Trigger.make({
        function: Ref.make(serializeFunction(AgentFunctions.Prompt)),
        enabled: true,
        spec: {
          kind: 'subscription',
          query: {
            ast: organizationsQuery.ast,
          },
        },
        input: {
          prompt: Ref.make(researchPrompt),
          input: {
            organization: '{{event.subject}}',
          },
        },
      });
      space.db.add(researchTrigger);

      const mailboxView = ViewModel.make({
        query: Query.select(Filter.type(Message.Message)).select(Filter.tag(tagDxn)).from(mailbox),
        jsonSchema: JsonSchema.toJsonSchema(Message.Message),
      });
      const contactsView = ViewModel.make({
        query: contactsQuery,
        jsonSchema: JsonSchema.toJsonSchema(Person.Person),
      });
      const organizationsView = ViewModel.make({
        query: organizationsQuery,
        jsonSchema: JsonSchema.toJsonSchema(Organization.Organization),
      });
      const notesView = ViewModel.make({
        query: notesQuery,
        jsonSchema: JsonSchema.toJsonSchema(Markdown.Document),
      });

      space.db.add(
        Pipeline.make({
          name: 'Investor Research',
          columns: [
            {
              name: 'Mailbox',
              view: Ref.make(mailboxView),
              order: [],
            },
            {
              name: 'Contacts',
              view: Ref.make(contactsView),
              order: [],
            },
            {
              name: 'Organizations',
              view: Ref.make(organizationsView),
              order: [],
            },
            {
              name: 'Notes',
              view: Ref.make(notesView),
              order: [],
            },
          ],
        }),
      );
    },
  }),
  args: {
    modules: [[ProjectModule], [TriggersModule, InvocationsModule]],
    blueprints: [],
  },
};

export const WithScript: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const [{ MarkdownPlugin }, { ScriptPlugin }] = await Promise.all([
        import('@dxos/plugin-markdown'),
        import('@dxos/plugin-script'),
      ]);
      return { plugins: [MarkdownPlugin(), ScriptPlugin()] };
    },
    config: config.local,
    types: [Script.Script, Text.Text],
    onInit: async ({ client, space }) => {
      const [{ getAccessCredential }, { templates }] = await Promise.all([
        import('@dxos/plugin-script'),
        import('@dxos/plugin-script/templates'),
      ]);
      const { identityKey } = client.halo.identity.get()!;
      await client.halo.writeCredentials([getAccessCredential(identityKey)]);

      const template = templates.find((template) => template.id === 'org.dxos.script.forex-effect');
      invariant(template, 'Template not found');
      invariant(template.name, 'Template name not found');

      // Ensure at least one Script exists so the React surface can render.
      space.db.add(
        Script.make({
          name: template.name,
          description: 'Function to get the exchange rates between two currencies.',
          changed: true,
          source: template.source,
        }),
      );

      space.db.add(
        Blueprint.make({
          key: 'org.dxos.blueprint.forex',
          name: 'Forex',
          instructions: Template.make({
            source: trim`
              You can get the exchange rate between two currencies.
            `,
          }),
          tools: [ToolId.make('org.dxos.script.forex-effect')],
        }),
      );

      await space.db.flush();
    },
    onChatCreated: async ({ space, binder }) => {
      const blueprints = await space.db.query(Query.select(Filter.type(Blueprint.Blueprint))).run();
      await binder.bind({ blueprints: blueprints.map((blueprint) => Ref.make(blueprint)) });
    },
  }),
  args: {
    modules: [[ChatModule], [ScriptModule]],
  },
};

export const WithPrompt: Story = {
  decorators: getDecorators({
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown');
      return { plugins: [MarkdownPlugin()] };
    },
    config: config.remote,
    types: [Text.Text],
    onInit: async ({ space }) => {
      space.db.add(serializeFunction(AgentFunctions.Prompt));
      space.db.add(
        Prompt.make({
          name: 'Research',
          description: 'Research organization',
          input: Schema.Struct({
            org: Schema.Any,
          }),
          output: Schema.Any,

          instructions:
            'Research the organization provided as input. Absolutely, in all cases, create a research note for it at the end. NOTE: Do mocked reseach (set mockSearch to true).',
          blueprints: [Ref.make(ResearchBlueprint.make())],
        }),
      );

      await space.db.flush();
    },
  }),
  args: {
    modules: [[PromptModule], [InvocationsModule]],
  },
};
