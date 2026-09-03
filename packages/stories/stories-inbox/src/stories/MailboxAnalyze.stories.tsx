//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, within } from 'storybook/test';

import { Provider } from '@dxos/ai';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Role from '@dxos/app-framework/Role';
import { Surface, useCapabilities, useOptionalCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { useActiveSpace, useProgressMonitors } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Feed, Filter, Obj, Query, Ref, Tag } from '@dxos/echo';
import { EffectEx, createKvsStore } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { AccessToken, Connection, Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as Assistant from '@dxos/plugin-assistant/Assistant';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';
import * as BrainOperation from '@dxos/plugin-brain/BrainOperation';
import * as BrainPlugin from '@dxos/plugin-brain/BrainPlugin';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import { translations as connectorTranslations } from '@dxos/plugin-connector/translations';
import * as CrmOperation from '@dxos/plugin-crm/CrmOperation';
import * as CrmPlugin from '@dxos/plugin-crm/CrmPlugin';
import * as ProfileOf from '@dxos/plugin-crm/ProfileOf';
import * as ExtractedFrom from '@dxos/plugin-inbox/ExtractedFrom';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as MessageExtractor from '@dxos/plugin-inbox/MessageExtractor';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as ProgressPlugin from '@dxos/plugin-progress/ProgressPlugin';
import * as ProjectMailboxOperation from '@dxos/plugin-projects/ProjectMailboxOperation';
import * as ProjectOperationHandlerSet from '@dxos/plugin-projects/ProjectOperationHandlerSet';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as Booking from '@dxos/plugin-trip/Booking';
import * as Segment from '@dxos/plugin-trip/Segment';
import { TripPlugin } from '@dxos/plugin-trip/testing';
import * as Trip from '@dxos/plugin-trip/Trip';
import { useClient } from '@dxos/react-client';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel, Select, Toolbar } from '@dxos/react-ui';
import { ProgressMeter } from '@dxos/react-ui-components';
import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { TagIndex, Text } from '@dxos/schema';
import {
  ModuleContainer,
  StoryAiPlugin,
  UpdateCompanionStubPlugin,
  createStoryDecorators,
} from '@dxos/storybook-testing';
import { ModuleRole, moduleSurfaces } from '@dxos/storybook-testing/modules';
import { Message, Organization, Person, Task } from '@dxos/types';

import { StoryRole } from '../modules';
import { StoryTripAiPlugin, seedFromFixture, seedFromMessages, seedFromObjects, seedFromTrips } from '../testing';
import { StoryModulesPlugin } from '../testing/modules';

/** Local Ollama model driving the `AnalyzeMailbox` fact variant; Ollama needs `strict: false`. */
const OLLAMA_MODEL = 'com.alibaba.model.qwen-2-5-7b.instruct';

/** The fixture corpus owner's addresses — the `me` input for `ExtractCorrespondents`. */
const USER_EMAILS = ['rich.burdon@gmail.com', 'rich@braneframe.com'];

/** Admin-tracking anchor senders (fixture team domain first, then the demo seed's). */
const TRACKED_SENDER_RE = /@(kirkconsult\.com|sequoia\.com)$/i;

/** Investor domains for the Investor Conversations pipeline (fixture VCs + the demo seed's). */
const INVESTOR_DOMAINS = ['backed.vc', 'blueyard.com', 'dispersion.xyz', 'sequoia.com'];

/** Role token for the story-local process module, referenced by the `ModuleContainer` layout. */
const ProcessRole = Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.process');

/** A selectable workbench pipeline: `run` returns the payload rendered as the `last` count. */
type StoryAction = {
  id: string;
  label: string;
  run: () => Promise<unknown>;
};

/**
 * Story-local module: drives the cursored mailbox pipelines and their cursor resets via the
 * OperationInvoker (the same operations the mailbox toolbar runs), reporting live counts so the play
 * function can assert cursor semantics from the DOM.
 * Resolves the active space like every module surface (`ModuleContainer` sets the workspace).
 */
const ProcessModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <ProcessModuleContainer space={space} />;
};

// Split from the space guard above: an early return before hooks changes the hook count between
// renders (the active space resolves after first mount) and React throws.
const ProcessModuleContainer = ({ space }: { space: Space }) => {
  const client = useClient();
  const identity = useIdentity();
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const feed = mailbox?.feed?.target;
  const messages = useQuery(
    space.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );

  // Messages with a recorded Message → extracted-object association on the Mailbox.
  const linked = messages.filter((message) => Mailbox.getExtractedObjectIds(mailbox, message.id).length > 0).length;

  const cursors = useQuery(space.db, Filter.type(Cursor.Cursor));

  const organizations = useQuery(space.db, Filter.type(Organization.Organization));
  const contacts = useQuery(space.db, Filter.type(Person.Person));
  const projects = useQuery(space.db, Filter.type(Project.Project));
  const tasks = useQuery(space.db, Filter.type(Task.Task));
  const profiles = useQuery(space.db, Filter.type(ProfileOf.ProfileOf));
  const trips = useQuery(space.db, Filter.type(Trip.Trip));
  const segments = useQuery(space.db, Filter.type(Segment.Segment));
  const relations = useQuery(space.db, Filter.type(ExtractedFrom.ExtractedFrom));

  const [invoker] = useCapabilities(Capabilities.OperationInvoker);
  const [factStores] = useCapabilities(BrainCapabilities.FactStoreRegistry);

  const progressRegistry = useOptionalCapability(AppCapabilities.ProgressRegistry);
  // Every invoker run is a process emitting `status.update` trace events; the progress sink projects
  // them into the registry, so the meters below mirror the app's statusbar (incl. cancel).
  const monitors = useProgressMonitors();

  const [runs, setRuns] = useState(0);
  const [last, setLast] = useState<unknown>();
  const [facts, setFacts] = useState(0);

  /**
   * The consolidated reset group, rendered as toolbar buttons (not actions — a reset zeroes the run
   * counters rather than counting as a run). Same `StoryAction` shape so error handling is uniform.
   */
  const resets = useMemo<StoryAction[]>(() => {
    if (!invoker || !mailbox) {
      return [];
    }

    return [
      {
        // Full client reset: wipes the profile (OPFS) and reloads the page.
        id: 'reset-store',
        label: 'Client',
        run: async () => {
          await client.reset();
          window.location.reload();
          return { reset: 'store' };
        },
      },
      {
        // Clears the shared FactStore (not ECHO-reactive, so the count is zeroed explicitly).
        id: 'reset-facts',
        label: 'Facts',
        run: async () => {
          await EffectEx.runPromise(
            factStores
              .forSpace(space.id)
              .clear()
              .pipe(Effect.orElseSucceed(() => undefined)),
          );
          setFacts(0);
          return { reset: 'facts' };
        },
      },
      {
        // Every pipeline cursor at once: the tagged classify cursor (reset operation) and
        // the analyze pipeline's UNTAGGED feed cursor (a plain object removal — it predates the
        // tagged-consumer convention), so the next run of any cursored pipeline re-reads the feed.
        id: 'reset',
        label: 'Cursors',
        run: async () => {
          const classify = await invoker.invokePromise(
            InboxOperation.ResetFeedCursor,
            { mailbox: Ref.make(mailbox), cursorId: 'classifyMailbox' },
            { spaceId: space.id },
          );
          const feedUri = mailbox.feed.uri;
          const cursors = await space.db.query(Filter.type(Cursor.Cursor)).run();
          const analyze = cursors.find(
            (cursor) =>
              cursor.spec.kind === 'feed' &&
              cursor.spec.source.uri === feedUri &&
              Obj.getMeta(cursor).keys.length === 0,
          );
          if (analyze) {
            space.db.remove(analyze);
          }
          return { classify, analyzeCursor: !!analyze };
        },
      },
    ];
  }, [space, client, invoker, mailbox, factStores]);

  const handleReset = useCallback(
    async (reset: StoryAction) => {
      const result = await reset.run().catch((err) => {
        log.warn('reset failed', { reset: reset.id, err });
        return { error: String(err) };
      });
      setLast(result);
      setRuns(0);
      setFacts(0);
    },
    [setLast, setRuns, setFacts],
  );

  /**
   * The selectable workbench pipelines. Each action's `run` returns the payload rendered as `last`;
   * side-effects beyond the operation itself (the analyze fact refresh, the projects composition)
   * live inside the action so the execute callback stays uniform.
   */
  const actions = useMemo<StoryAction[]>(() => {
    if (!invoker || !mailbox) {
      return [];
    }

    return [
      //
      // The cascade — spawns the tiers below in order (deterministic gate → cheap LLM labels).
      //
      {
        // Ollama drives the story's LLM tiers, so `strict: false` skips the structured-output pass
        // local models never honor.
        id: 'scan',
        label: 'InboxOperation.AnalyzeMailbox',
        run: () =>
          invoker.invokePromise(
            InboxOperation.AnalyzeMailbox,
            { mailbox: Ref.make(mailbox), me: USER_EMAILS, model: OLLAMA_MODEL, strict: false },
            { spaceId: space.id },
          ),
      },
      //
      // InboxOperation
      //
      {
        // Correspondent pipeline: Person (+ derived Organization) per sender the user has sent or
        // replied to — the outbound signal is derived from the feed, so no allow-list is needed.
        id: 'people',
        label: 'InboxOperation.ExtractCorrespondents',
        run: () =>
          invoker.invokePromise(
            InboxOperation.ExtractCorrespondents,
            { mailbox: Ref.make(mailbox), me: USER_EMAILS },
            { spaceId: space.id },
          ),
      },
      {
        // Subscription pipeline: unsubscribe affordances (header + body links) aggregated per
        // sender onto `mailbox.subscriptions`.
        id: 'links',
        label: 'InboxOperation.ExtractSubscriptions',
        run: () =>
          invoker.invokePromise(
            InboxOperation.ExtractSubscriptions,
            { mailbox: Ref.make(mailbox) },
            { spaceId: space.id },
          ),
      },
      {
        // Contact extractor over every feed message (explicitly selected, no dispatch).
        id: 'extract',
        label: 'InboxOperation.ExtractMailbox',
        run: () =>
          invoker.invokePromise(
            InboxOperation.ExtractMailbox,
            { mailbox: Ref.make(mailbox), extractorId: MessageExtractor.ContactMessageExtractor.id },
            { spaceId: space.id },
          ),
      },
      {
        // Auto-dispatch: `ExtractMessage` per message with no extractor named — the dispatcher
        // selects by match confidence (pairs with the `trip` seed's same-PNR collapse).
        id: 'dispatch',
        label: 'InboxOperation.ExtractMessage',
        run: async () => {
          let dispatched = 0;
          let failed = 0;
          for (const message of messages) {
            await invoker
              .invokePromise(InboxOperation.ExtractMessage, { source: message }, { spaceId: space.id })
              .then(() => {
                dispatched += 1;
              })
              .catch((err) => {
                failed += 1;
                log.warn('dispatch extract failed', { err, messageId: message.id });
              });
          }
          return failed > 0 ? { dispatched, failed } : { dispatched };
        },
      },
      {
        // Spam/label classification: cursored ≤100-message batches; known-Person senders are
        // short-circuited. Ollama, so `strict: false` skips the structured-output pass.
        id: 'classify',
        label: 'InboxOperation.ClassifyMailbox',
        run: () =>
          invoker.invokePromise(
            InboxOperation.ClassifyMailbox,
            { mailbox: Ref.make(mailbox), model: OLLAMA_MODEL, strict: false },
            { spaceId: space.id },
          ),
      },
      {
        // Per-message summaries over contact mail, appended to the mailbox's annotation feed and
        // merged back into the message article on read.
        id: 'summarize',
        label: 'InboxOperation.SummarizeMailbox',
        run: () =>
          invoker.invokePromise(
            InboxOperation.SummarizeMailbox,
            { mailbox: Ref.make(mailbox), model: OLLAMA_MODEL },
            { spaceId: space.id },
          ),
      },
      {
        // Fact analysis against local Ollama; the in-memory FactStore is not ECHO-reactive, so the
        // count is polled while the run commits per page, then refreshed once at the end.
        id: 'analyze',
        label: 'BrainOperation.AnalyzeMailbox',
        run: async () => {
          const refresh = async () => {
            const stored = await EffectEx.runPromise(
              factStores
                .forSpace(space.id)
                .query({})
                .pipe(Effect.orElseSucceed(() => [])),
            );
            setFacts(stored.length);
          };
          const timer = setInterval(() => void refresh(), 500);
          try {
            return await invoker.invokePromise(
              BrainOperation.AnalyzeMailbox,
              {
                mailbox: Ref.make(mailbox),
                model: OLLAMA_MODEL,
                provider: Provider.ollama.id,
                strict: false,
                pageSize: 1,
              },
              { spaceId: space.id },
            );
          } finally {
            clearInterval(timer);
            await refresh();
          }
        },
      },
      //
      // CrmOperation
      //
      {
        // CRM pipeline: cursored contact extraction + per-contact Profile scaffold (pairs with the
        // `crm` seed, whose Organizations satisfy the extraction gate).
        id: 'crm',
        label: 'CrmOperation.ProcessMailbox',
        run: () =>
          invoker.invokePromise(
            CrmOperation.ProcessMailbox,
            { mailbox: Ref.make(mailbox), research: true },
            { spaceId: space.id },
          ),
      },
      {
        // Image enrichment: Gravatar avatars + domain logos via the hardened CRM attach path
        // (needs the CORS proxy / image service).
        id: 'images',
        label: 'CrmOperation.EnrichImages',
        run: () => invoker.invokePromise(CrmOperation.EnrichImages, {}, { spaceId: space.id }),
      },
      //
      // ProjectMailboxOperation
      //
      {
        // Projects composition: create the admin tracking project from a tracked sender's message
        // (once; reruns reuse it), then run the travel-log and investor-log artifact pipelines
        // against it — the routine→operation→artifact pattern, driven manually.
        id: 'projects',
        label: 'ProjectMailboxOperation.CreateTrackingProject',
        run: async () => {
          const anchor =
            messages.find((message) => TRACKED_SENDER_RE.test(message.sender?.email ?? '')) ??
            messages.find((message) => !!message.sender?.email);
          if (!anchor) {
            return { error: 'no anchor message' };
          }

          let project = projects.find((candidate) => candidate.name?.endsWith('— Requests'));
          let created;
          if (!project) {
            created = await invoker.invokePromise(
              ProjectMailboxOperation.CreateTrackingProject,
              { mailbox: Ref.make(mailbox), message: anchor },
              { spaceId: space.id },
            );
            const fresh = await space.db.query(Filter.type(Project.Project)).run();
            project = fresh.find((candidate) => candidate.name?.endsWith('— Requests'));
          }
          if (!project) {
            return { error: 'tracking project not found after creation', created };
          }

          const travel = await invoker.invokePromise(
            ProjectMailboxOperation.UpdateTravelLog,
            { project: Ref.make(project), mailbox: Ref.make(mailbox) },
            { spaceId: space.id },
          );
          const investors = await invoker.invokePromise(
            ProjectMailboxOperation.UpdateInvestorLog,
            { project: Ref.make(project), mailbox: Ref.make(mailbox), domains: INVESTOR_DOMAINS },
            { spaceId: space.id },
          );

          return { created, travel, investors };
        },
      },
    ];
  }, [space, client, invoker, mailbox, messages, projects, factStores]);

  const [actionId, setActionId] = useState('scan');

  // The single invoker seam: every pipeline runs through here, so result/error handling and the
  // run counter are uniform. A failure is rendered as a terminal error state (never swallowed to
  // undefined): the play tests assert on the payload, so an error can never satisfy a success
  // assertion.
  const handleExecute = useCallback(async () => {
    const action = actions.find((candidate) => candidate.id === actionId);
    if (!action) {
      return;
    }
    const result = await action.run().catch((err) => {
      log.warn('action failed', { action: action.id, err });
      return { error: String(err) };
    });
    setLast(result);
    setRuns((count) => count + 1);
  }, [actions, actionId]);

  return (
    <Panel.Root>
      <Panel.Toolbar>
        <Toolbar.Root>
          <Toolbar.IconButton
            icon='ph--play--regular'
            iconOnly
            label='Execute'
            data-testid='execute'
            disabled={!invoker || !mailbox}
            onClick={() => void handleExecute()}
          />
          <Select.Root value={actionId} onValueChange={setActionId}>
            <Select.TriggerButton classNames='truncate' data-testid='action-select' placeholder='Action' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {actions.map((action) => (
                    // Testid selection (`action-<id>`): the play tests must survive label edits.
                    <Select.Option key={action.id} value={action.id} data-testid={`action-${action.id}`}>
                      {action.label}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content data-testid='counts' classNames='grid grid-cols-2'>
        <JsonHighlighter
          classNames='text-xs'
          data={{
            identity: identity?.identityKey.truncate(),
            runs,
            mailbox: mailbox ? 1 : 0,
            messages: messages.length,
            cursors: cursors.length,
            cursorMax: Cursor.parseKey(cursors[0]?.max),
            linked,
            facts,
            last,
          }}
        />
        <JsonHighlighter
          classNames='text-xs'
          data={{
            organizations: organizations.length,
            contacts: contacts.length,
            images: contacts.filter((contact) => !!contact.image).length,
            subscriptions: mailbox?.subscriptions?.length ?? 0,
            profiles: profiles.length,
            trips: trips.length,
            segments: segments.length,
            relations: relations.length,
            projects: projects.length,
            tasks: tasks.length,
          }}
        />
      </Panel.Content>
      <Panel.Statusbar classNames='flex flex-col'>
        {monitors.map((monitor) => (
          <ProgressMeter
            key={monitor.name}
            state={monitor}
            classNames='border-t border-separator'
            onCancel={progressRegistry ? () => progressRegistry.cancel(monitor.name) : undefined}
          />
        ))}
        <Toolbar.Root>
          {resets.map((reset) => (
            <Toolbar.IconButton
              key={reset.id}
              icon='ph--trash--regular'
              label={reset.label}
              data-testid={reset.id}
              disabled={!invoker || !mailbox}
              onClick={() => void handleReset(reset)}
            />
          ))}
        </Toolbar.Root>
      </Panel.Statusbar>
    </Panel.Root>
  );
};

/**
 * Registers the story-local process module surface plus the shared diagnostic module surfaces
 * (Logging etc. — see `@dxos/storybook-testing/modules`), so the `ModuleContainer` layout can
 * reference both by role token.
 */
const StoryProcessPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.processPipeline'),
    name: 'Process Pipeline Story Modules',
  }),
).pipe(
  Plugin.addModule({
    id: 'process-pipeline-modules',
    provides: [Capabilities.ReactSurface],
    activate: () =>
      Effect.succeed([
        Capability.contribute(Capabilities.ReactSurface, [
          Surface.create({ id: 'inbox.process', filter: Surface.makeFilter(ProcessRole), component: ProcessModule }),
          ...moduleSurfaces,
        ]),
      ]),
  }),
  // The mailbox→project pipelines (Projects button) without activating the full ProjectsPlugin.
  Plugin.addModule(
    Capability.inlineModule('ProjectOperationHandlers', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([Capability.contribute(Capabilities.OperationHandler, ProjectOperationHandlerSet.handlers)]),
    ),
  ),
  // The assistant Settings capability the TracePanel (Trace/SwarmTrace cells) requires — contributed
  // directly rather than by installing AssistantPlugin, whose AiService LayerSpec would displace the
  // per-variant story AiService (the canned trip payloads broke with AiModelNotAvailableError).
  Plugin.addModule(
    Capability.inlineModule('AssistantSettings', { provides: [AssistantCapabilities.Settings] }, () =>
      Effect.succeed([
        Capability.contribute(
          AssistantCapabilities.Settings,
          createKvsStore({
            key: 'org.dxos.plugin.inbox.story.assistant',
            schema: Assistant.Settings,
            defaultValue: () => ({}),
          }),
        ),
      ]),
    ),
  ),
  Plugin.make,
);

const DefaultStory = () => (
  <ModuleContainer
    layout={[
      [ProcessRole, StoryRole.Mailbox],
      [ModuleRole.Objects, StoryRole.Facts],
      [StoryRole.Trace, ModuleRole.Logging],
    ]}
  />
);

/**
 * `live` seeds nothing and switches the client to persistent OPFS storage against EDGE dev, so the
 * connector OAuth round trip (which reloads the page) can resume — the ex-MailboxPipeline flow. The
 * other kinds seed a fresh in-memory profile.
 */
type StoryArgs = { seed: 'fixture' | 'crm' | 'demo' | 'trip' };

const meta = {
  title: 'stories/stories-inbox/MailboxAnalyze',
  render: DefaultStory,
  // Initializer form: the seed variant is a story arg, so one plugin set serves every story.
  decorators: createStoryDecorators<StoryArgs>(({ args }) => ({
    setupEvents: [ActivationEvents.Startup],
    types: [
      AccessToken.AccessToken,
      Booking.Booking,
      Connection.Connection,
      Cursor.Cursor,
      ExtractedFrom.ExtractedFrom,
      Feed.Feed,
      Mailbox.Mailbox,
      Markdown.Document,
      Message.Message,
      Organization.Organization,
      Person.Person,
      ProfileOf.ProfileOf,
      Segment.Segment,
      Tag.Tag,
      Trip.Trip,
      TagIndex.TagIndex,
      Text.Text,
    ],
    onInit: async ({ space }) => {
      const mailbox = space.db.add(Mailbox.make({ name: 'Inbox' }));
      await space.db.flush();

      switch (args.seed) {
        case 'fixture':
          await seedFromFixture(space, mailbox);
          break;
        case 'crm':
          await seedFromObjects(space, mailbox);
          break;
        case 'demo':
          await seedFromMessages(space, mailbox);
          break;
        case 'trip':
          await seedFromTrips(space, mailbox);
          break;
      }
    },
    plugins: [
      SpacePlugin({}),
      InboxPlugin(),
      BrainPlugin.make(),
      ConnectorPlugin.make(),
      CrmPlugin.make(),
      MarkdownPlugin.make(),
      PreviewPlugin.make(),
      ProgressPlugin.make(),
      TripPlugin(),
      // Both provide the `AiService` LayerSpec, so exactly one is registered per variant: the trip
      // seed needs the canned flight payloads; every other variant targets local Ollama.
      args.seed === 'trip' ? StoryTripAiPlugin() : StoryAiPlugin({ ai: 'ollama' }),
      StoryModulesPlugin(),
      StoryProcessPlugin(),
      UpdateCompanionStubPlugin(),
    ],
  })),
  parameters: {
    layout: 'fullscreen',
    translations: [...debugTranslations, ...connectorTranslations],
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Plain demo messages, no Organizations — the ex-MailboxPipeline seeded variant. */
export const Demo: Story = {
  args: {
    seed: 'demo',
  },
};

export const Fixture: Story = {
  args: {
    seed: 'fixture',
  },
};

/**
 * The cursored log-title pipeline over a seeded mailbox — the `@dxos/fixtures` corpus when pulled,
 * the demo messages otherwise, so the assertions are count-agnostic: the first run processes every
 * seeded message and creates the tagged feed cursor; a rerun processes nothing (strictly-greater
 * skip); reset clears the cursor (reusing the object, zeroing the run counter) so the next run
 * re-processes the whole feed.
 */
export const FixtureTest: Story = {
  args: {
    seed: 'fixture',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const waitFor = async (
      predicate: (text: string) => boolean,
      { timeout = 30_000, interval = 100 }: { timeout?: number; interval?: number } = {},
    ): Promise<string> => {
      const deadline = Date.now() + timeout;
      let text = canvas.queryByTestId('counts')?.textContent ?? '';
      while (Date.now() < deadline) {
        if (predicate(text)) {
          return text;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
        text = canvas.queryByTestId('counts')?.textContent ?? '';
      }
      return text;
    };

    // The cursor-semantics assertions that lived here drove `InboxOperation.ProcessMailbox`, which has
    // been deleted; the surviving cursor helpers are covered by node tests (`cursor.test.ts`) instead.
    // What remains worth asserting from the browser is that the fixture corpus actually loads.
    const countOf = (text: string): number => Number(/"messages":\s*(\d+)/.exec(text)?.[1] ?? 0);
    let messageCount = 0;
    let stablePolls = 0;
    await waitFor(
      (text) => {
        const count = countOf(text);
        stablePolls = count > 0 && count === messageCount ? stablePolls + 1 : 0;
        messageCount = count;
        return stablePolls >= 3;
      },
      { interval: 500 },
    );
    void expect(stablePolls).toBeGreaterThanOrEqual(3);
    void expect(messageCount).toBeGreaterThan(0);
  },
};
