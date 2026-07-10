//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { EXA_API_KEY } from '@dxos/ai/testing';
import { DatabaseSkill, RunInstructions, WebSearchSkill } from '@dxos/assistant-toolkit';
import { Instructions, Operation, Trigger } from '@dxos/compute';
import { Feed, Filter, JsonSchema, Obj, Query, Ref, Tag, View } from '@dxos/echo';
import { AssistantSkill } from '@dxos/plugin-assistant';
import { CrmSkill } from '@dxos/plugin-crm';
import { ProfileOf } from '@dxos/plugin-crm/types';
import { InboxSkill, Mailbox } from '@dxos/plugin-inbox';
import { Markdown, MarkdownSkill } from '@dxos/plugin-markdown';
import { Routine } from '@dxos/plugin-routine';
import { ViewModel } from '@dxos/schema';
import { AccessToken, Employer, HasConnection, HasSubject, Message, Organization, Person, Pipeline } from '@dxos/types';
import { trim } from '@dxos/util';

import {
  Module,
  ModuleContainer,
  ResearchInputQueue,
  addTestData,
  config,
  createDecorators,
  createTestMailbox,
  loadMockInboxSnapshot,
  organizations,
  testTypes,
} from '../testing';
import { storyDecorators, storyParameters } from './meta';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Data',
  render: ModuleContainer,
  decorators: storyDecorators,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Echo types used by research-related stories (replaces removed ResearchDataTypes). */
const researchStoryEchoTypes = [Person.Person, Organization.Organization, Message.Message];

const DXOS_DOCUMENT = trim`
  # DXOS
  - ECHO Semantic Graph Database
  - AI-Native workflows
  - Privacy preserving P2P sync
  - Edge computing
  - Flexible access control
  - Open and extensible
`;

/**
 * PROMPT: "Create a research note for the organization."
 */
export const WithResearch: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ MarkdownPlugin }, { TablePlugin }, { ThreadPlugin }] = await Promise.all([
        import('@dxos/plugin-markdown/plugin'),
        import('@dxos/plugin-table/plugin'),
        import('@dxos/plugin-thread/plugin'),
      ]);
      return {
        plugins: [MarkdownPlugin(), TablePlugin(), ThreadPlugin()],
      };
    },
    config: config.remote,
    types: [...researchStoryEchoTypes, Feed.Feed],
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
    layout: [[Module.Chat], [Module.Graph, Module.ExecutionGraph]],
    skills: [
      // AssistantSkill.key
      // TODO(burdon): Too many open-ended tools (querying for tools, querying for schema) confuses the model.
      WebSearchSkill.key,
    ],
  },
};

export const WithSearch: Story = {
  decorators: createDecorators({
    config: config.remote,
    types: testTypes,
    onInit: async ({ space }) => {
      await addTestData(space);
    },
  }),
  args: {
    layout: [[Module.Chat], [Module.Graph]],
  },
};

/**
 * Database explorer panel: query bar with graph, object-tree, and cards views.
 */
export const WithDatabase: Story = {
  decorators: createDecorators({
    config: config.local,
    types: testTypes,
    onInit: async ({ space }) => {
      await addTestData(space);
    },
  }),
  args: {
    layout: [[Module.Database]],
  },
};

export const WithResearchQueue: Story = {
  decorators: createDecorators({
    plugins: [],
    config: config.remote,
    types: [...researchStoryEchoTypes, ResearchInputQueue, Feed.Feed],
    accessTokens: [Obj.make(AccessToken.AccessToken, { source: 'exa.ai', token: EXA_API_KEY })],
    onInit: async ({ space }) => {
      const feed = space.db.add(Feed.make());
      const researchInputQueue = space.db.add(Obj.make(ResearchInputQueue, { feed: Ref.make(feed) }));
      const orgs = organizations.map(({ id: _, ...org }) => Obj.make(Organization.Organization, org));
      await space.db.appendToFeed(feed, orgs);

      const researchPrompt = space.db.add(
        Instructions.make({
          name: 'Research',
          description: 'Research organization',
          text: 'Research the organization provided as input. Create a research note for it at the end. NOTE: Do mocked research (set mockSearch to true).',
          skills: [Ref.make(WebSearchSkill.make())],
        }),
      );

      space.db.add(
        Trigger.make({
          runnable: Ref.make(Operation.serialize(RunInstructions)),
          enabled: true,
          spec: Trigger.specFeed(feed),
          input: {
            instructions: Ref.make(researchPrompt),
            input: '{{event.item}}',
          },
        }),
      );
    },
  }),
  args: {
    layout: [
      [Module.ResearchInput, Module.ResearchOutput],
      [Module.Triggers, Module.Invocations, Module.Routine, Module.Graph],
    ],
    skills: [WebSearchSkill.key],
  },
};

export const WithProject: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ InboxPlugin }, { MarkdownPlugin }, { PipelinePlugin }] = await Promise.all([
        import('@dxos/plugin-inbox/plugin'),
        import('@dxos/plugin-markdown/plugin'),
        import('@dxos/plugin-pipeline/plugin'),
      ]);
      return {
        plugins: [InboxPlugin(), MarkdownPlugin(), PipelinePlugin()],
      };
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
      const tagRef = Ref.make(tag);
      const tagUri = Obj.getURI(tag);

      people.slice(0, 4).forEach((person) => {
        Obj.update(person, (person) => {
          Obj.getMeta(person).tags = [tagRef];
        });
      });

      const mailbox = space.db.add(Mailbox.make({ name: 'Mailbox' }));
      await space.db.flush();
      const mailboxFeed = await mailbox.feed.load();
      const messages = createTestMailbox(people);
      await space.db.appendToFeed(mailboxFeed, messages);

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
        Obj.update(research, (research) => {
          Obj.getMeta(research).tags = [tagRef];
        });
      });

      const dxos = organizations.find((org) => org.name === 'DXOS')!;
      const blueyard = organizations.find((org) => org.name === 'BlueYard')!;
      [dxos, blueyard].forEach((organization) => {
        Obj.update(organization, (organization) => {
          Obj.getMeta(organization).tags = [tagRef];
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

      const contactsQuery = Query.select(Filter.type(Person.Person)).select(Filter.tag(tagUri));
      const organizationsQuery = Query.select(Filter.type(Organization.Organization)).select(Filter.tag(tagUri));
      const notesQuery = Query.select(Filter.type(Markdown.Document)).select(Filter.tag(tagUri));

      const researchPrompt = space.db.add(
        Instructions.make({
          name: 'Research',
          description: 'Research organization',
          text: trim`
            Research the organization provided as input.
            Absolutely, in all cases, create a research note for it at the end.
            NOTE: Do mocked research (set mockSearch to true).

            {{organization}}
          `,
          skills: [Ref.make(WebSearchSkill.make())],
        }),
      );

      const researchTrigger = Trigger.make({
        runnable: Ref.make(Operation.serialize(RunInstructions)),
        enabled: true,
        spec: Trigger.specSubscription(organizationsQuery),
        input: {
          instructions: Ref.make(researchPrompt),
          input: {
            organization: '{{event.subject}}',
          },
        },
      });
      space.db.add(researchTrigger);

      const mailboxView = ViewModel.make({
        query: Query.select(Filter.type(Message.Message)).select(Filter.tag(tagUri)).from(mailbox),
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
    layout: [[Module.Project], [Module.Triggers, Module.Invocations]],
    skills: [],
  },
};

/**
 * CRM chat over a Gmail-synced mailbox seeded from `mock-inbox.dx.json`.
 * Test with prompt: Research contacts from my recent emails.
 */
export const WithCRM: Story = {
  decorators: createDecorators({
    importSnapshot: loadMockInboxSnapshot,
    lazyPlugins: async () => {
      const [{ CrmPlugin }, { InboxPlugin }, { MarkdownPlugin }, { TablePlugin }] = await Promise.all([
        import('@dxos/plugin-crm/plugin'),
        import('@dxos/plugin-inbox/plugin'),
        import('@dxos/plugin-markdown/plugin'),
        import('@dxos/plugin-table/plugin'),
      ]);
      return {
        plugins: [CrmPlugin(), InboxPlugin(), MarkdownPlugin(), TablePlugin()],
      };
    },
    config: config.remote,
    types: [
      AccessToken.AccessToken,
      Feed.Feed,
      Instructions.Instructions,
      Mailbox.Mailbox,
      Message.Message,
      Organization.Organization,
      Person.Person,
      ProfileOf.ProfileOf,
      Routine.Routine,
      Tag.Tag,
      Trigger.Trigger,
    ],
    onChatCreated: async ({ space, binder }) => {
      const mailboxes = await space.db.query(Filter.type(Mailbox.Mailbox)).run();
      const mailbox = mailboxes[0];
      if (mailbox) {
        await binder.bind({ objects: [Ref.make(mailbox)] });
      }
    },
  }),
  args: {
    layout: [[Module.Chat], [Module.Inbox], [Module.RoutineCompanion, Module.Trace], [Module.Database]],
    skills: [
      AssistantSkill.key,
      CrmSkill.key,
      DatabaseSkill.key,
      InboxSkill.key,
      MarkdownSkill.key,
      WebSearchSkill.key,
    ],
  },
};
