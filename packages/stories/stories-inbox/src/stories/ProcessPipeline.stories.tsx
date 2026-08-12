//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Provider } from '@dxos/ai';
import { Role } from '@dxos/app-framework';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useCapabilities, useOptionalCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ProgressMeter, useActiveSpace, useProgressMonitors } from '@dxos/app-toolkit/ui';
import { Feed, Filter, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';
import { BrainPlugin } from '@dxos/plugin-brain/plugin';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CrmOperation from '@dxos/plugin-crm/CrmOperation';
import { CrmPlugin } from '@dxos/plugin-crm/plugin';
import * as ProfileOf from '@dxos/plugin-crm/ProfileOf';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { ContactMessageExtractor } from '@dxos/plugin-inbox/operations';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { ProgressPlugin } from '@dxos/plugin-progress/plugin';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { translations as debugTranslations } from '@dxos/react-ui-debug/translations';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { TagIndex, Text } from '@dxos/schema';
import { ModuleContainer } from '@dxos/storybook-testing';
import { ModuleRole, moduleSurfaces } from '@dxos/storybook-testing/modules';
import { Message, Organization, Person } from '@dxos/types';

import { StoryAiPlugin, type StorySeed, seedStoryMailbox } from '../testing';

/** Local Ollama model driving the `AnalyzeMailbox` fact variant; Ollama needs `strict: false`. */
const OLLAMA_MODEL = 'com.alibaba.model.qwen-2-5-7b.instruct';

/** Role token for the story-local process module, referenced by the `ModuleContainer` layout. */
const ProcessRole = Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.process');

/**
 * Story-local module: drives the cursored `ProcessMailbox` pipeline, `ResetProcessCursor`, and the
 * `AnalyzeMailbox` fact variant via the OperationInvoker (the same operations the mailbox toolbar
 * runs), reporting live counts so the play function can assert cursor semantics from the DOM.
 * Resolves the active space like every module surface (`ModuleContainer` sets the workspace).
 */
const ProcessModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <ProcessModuleContainer space={space} />;
};

const ProcessModuleContainer = ({ space }: { space: Space }) => {
  const [mailbox] = useQuery(space.db, Filter.type(Mailbox.Mailbox));
  const feed = mailbox?.feed?.target;
  const messages = useQuery(
    space.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const cursors = useQuery(space.db, Filter.type(Cursor.Cursor));
  const contacts = useQuery(space.db, Filter.type(Person.Person));
  const profiles = useQuery(space.db, Filter.type(ProfileOf.ProfileOf));
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);
  const [factStores] = useCapabilities(BrainCapabilities.FactStoreRegistry);
  const [runs, setRuns] = useState(0);
  const [last, setLast] = useState<unknown>();
  const [facts, setFacts] = useState(0);

  // Every invoker run is a process emitting `status.update` trace events; the progress sink projects
  // them into the registry, so the meters below mirror the app's statusbar (incl. cancel).
  const monitors = useProgressMonitors();
  const progressRegistry = useOptionalCapability(AppCapabilities.ProgressRegistry);

  // Messages with a recorded Message → extracted-object association on the Mailbox.
  const linked = mailbox
    ? messages.filter((message) => Mailbox.getExtractedObjectIds(mailbox, message.id).length > 0).length
    : 0;

  const handleReset = useCallback(async () => {
    if (!invoker || !mailbox) {
      return;
    }

    const result = await invoker
      .invokePromise(InboxOperation.ResetProcessCursor, { mailbox: Ref.make(mailbox) }, { spaceId: space.id })
      .catch((err) => {
        log.warn('reset process cursor failed', { err });
        return { error: String(err) };
      });
    setLast(result);
    setRuns(0);
    setFacts(0);
  }, [space, invoker, mailbox]);

  const handleProcess = useCallback(async () => {
    if (!invoker || !mailbox) {
      return;
    }

    // A failure is rendered as a terminal error state (never swallowed to undefined): the play test
    // asserts on the result payload, so an error can never satisfy a success assertion.
    const result = await invoker
      .invokePromise(InboxOperation.ProcessMailbox, { mailbox: Ref.make(mailbox) }, { spaceId: space.id })
      .catch((err) => {
        log.warn('process mailbox failed', { err });
        return { error: String(err) };
      });
    setLast(result);
    setRuns((count) => count + 1);
  }, [space, invoker, mailbox]);

  // Contact-extraction pipeline: runs the deterministic contact extractor over every feed message
  // (a Person per sender, linked to a known Organization by domain); results land in the space and
  // are visible in the Database module.
  const handleExtract = useCallback(async () => {
    if (!invoker || !mailbox) {
      return;
    }

    const result = await invoker
      .invokePromise(
        InboxOperation.ExtractMailbox,
        { mailbox: Ref.make(mailbox), extractorId: ContactMessageExtractor.id },
        { spaceId: space.id },
      )
      .catch((err) => {
        log.warn('extract contacts failed', { err });
        return { error: String(err) };
      });
    setLast(result);
    setRuns((count) => count + 1);
  }, [space, invoker, mailbox]);

  // CRM pipeline: cursored contact extraction + per-contact Profile scaffold (deterministic; the
  // extraction gate needs the seeded Organizations, so it pairs with the `crm` seed).
  const handleCrm = useCallback(async () => {
    if (!invoker || !mailbox) {
      return;
    }

    const result = await invoker
      .invokePromise(CrmOperation.ProcessMailbox, { mailbox: Ref.make(mailbox), research: true }, { spaceId: space.id })
      .catch((err) => {
        log.warn('crm process mailbox failed', { err });
        return { error: String(err) };
      });
    setLast(result);
    setRuns((count) => count + 1);
  }, [space, invoker, mailbox]);

  const handleAnalyze = useCallback(async () => {
    if (!invoker || !mailbox) {
      return;
    }

    const result = await invoker
      .invokePromise(
        InboxOperation.AnalyzeMailbox,
        { mailbox: Ref.make(mailbox), model: OLLAMA_MODEL, provider: Provider.ollama.id, strict: false, pageSize: 1 },
        { spaceId: space.id },
      )
      .catch((err) => {
        log.warn('analyze mailbox failed', { err });
        return { error: String(err) };
      });
    setLast(result);
    setRuns((count) => count + 1);

    // The in-memory FactStore is not ECHO-reactive, so refreshes are explicit (after each run).
    const stored = await EffectEx.runPromise(
      factStores
        .forSpace(space.id)
        .query({})
        .pipe(Effect.orElseSucceed(() => [])),
    );
    setFacts(stored.length);
  }, [space, invoker, mailbox, factStores]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button data-testid='reset' disabled={!invoker || !mailbox} onClick={() => void handleReset()}>
            Reset
          </Toolbar.Button>
          <Toolbar.Button data-testid='process' disabled={!invoker || !mailbox} onClick={() => void handleProcess()}>
            Process
          </Toolbar.Button>
          <Toolbar.Button data-testid='extract' disabled={!invoker || !mailbox} onClick={() => void handleExtract()}>
            Extract
          </Toolbar.Button>
          <Toolbar.Button data-testid='crm' disabled={!invoker || !mailbox} onClick={() => void handleCrm()}>
            CRM
          </Toolbar.Button>
          <Toolbar.Button data-testid='analyze' disabled={!invoker || !mailbox} onClick={() => void handleAnalyze()}>
            Analyze
          </Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content data-testid='counts' classNames='dx-container overflow-auto p-2 text-sm'>
        <JsonHighlighter
          data={{
            runs,
            mailbox: mailbox ? 1 : 0,
            messages: messages.length,
            cursors: cursors.length,
            cursorMax: Cursor.parseKey(cursors[0]?.max),
            contacts: contacts.length,
            profiles: profiles.length,
            linked,
            facts,
            last,
          }}
        />
      </Panel.Content>
      {monitors.length > 0 && (
        <Panel.Statusbar classNames='flex flex-col'>
          {monitors.map((monitor) => (
            <ProgressMeter
              key={monitor.name}
              state={monitor}
              classNames='border-t border-separator'
              onCancel={progressRegistry ? () => progressRegistry.cancel(monitor.name) : undefined}
            />
          ))}
        </Panel.Statusbar>
      )}
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
  Plugin.make,
);

const DefaultStory = () => <ModuleContainer layout={[[ProcessRole], [ModuleRole.Database, ModuleRole.Logging]]} />;

type StoryArgs = { seed: StorySeed };

const meta = {
  title: 'stories/stories-inbox/ProcessPipeline',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    // Initializer form: the seed variant is a story arg, so one plugin set serves every story.
    withPluginManager<StoryArgs>(({ args }) => ({
      setupEvents: [ActivationEvents.Startup],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [
            Cursor.Cursor,
            Feed.Feed,
            Mailbox.Mailbox,
            Markdown.Document,
            Message.Message,
            Organization.Organization,
            Person.Person,
            ProfileOf.ProfileOf,
            TagIndex.TagIndex,
            Text.Text,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => seedStoryMailbox(defaultSpace, args.seed));
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        BrainPlugin(),
        CrmPlugin(),
        MarkdownPlugin(),
        ProgressPlugin(),
        StoryAiPlugin(),
        StoryProcessPlugin(),
      ],
    })),
  ],
  args: { seed: 'fixture' },
  parameters: { layout: 'fullscreen', translations: debugTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The cursored log-title pipeline over a seeded mailbox — the `@dxos/fixtures` corpus when pulled,
 * the demo messages otherwise, so the assertions are count-agnostic: the first run processes every
 * seeded message and creates the tagged feed cursor; a rerun processes nothing (strictly-greater
 * skip); reset clears the cursor (reusing the object, zeroing the run counter) so the next run
 * re-processes the whole feed.
 */
export const Test: Story = {
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

    // Wait for the seeded messages to finish loading — the query streams results in, so capturing
    // on first sight of a nonzero count reads a partial corpus (e.g. 100 of 391). Require the count
    // to hold steady across several consecutive polls (the stream can pause between batches for
    // longer than one interval) before trusting it.
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
    // `waitFor` returns its last observation on timeout; a partial stream must fail here, not
    // masquerade as the baseline for the processed-count assertions below.
    void expect(stablePolls).toBeGreaterThanOrEqual(3);
    void expect(messageCount).toBeGreaterThan(0);

    // First pass: every seeded message is processed and the tagged cursor is created + advanced.
    await userEvent.click(canvas.getByTestId('process'));
    const afterFirst = await waitFor((text) => /"runs":\s*1\b/.test(text));
    void expect(afterFirst).toMatch(new RegExp(`"processed":\\s*${messageCount}\\b`));
    void expect(afterFirst).toMatch(/"cursors":\s*1\b/);
    void expect(afterFirst).not.toMatch(/"cursorMax":\s*0\b/);

    // Second pass: strictly-greater skip — nothing new to process.
    await userEvent.click(canvas.getByTestId('process'));
    const afterSecond = await waitFor((text) => /"runs":\s*2\b/.test(text));
    void expect(afterSecond).toMatch(/"processed":\s*0\b/);

    // Reset clears the cursor (object reused) and zeroes the run counter, so the next run
    // re-processes the whole feed.
    await userEvent.click(canvas.getByTestId('reset'));
    const afterReset = await waitFor((text) => /"reset":\s*true\b/.test(text));
    void expect(afterReset).toMatch(/"runs":\s*0\b/);
    void expect(afterReset).toMatch(/"cursorMax":\s*0\b/);
    await userEvent.click(canvas.getByTestId('process'));
    const afterRerun = await waitFor((text) => /"runs":\s*1\b/.test(text) && /"processed":/.test(text));
    void expect(afterRerun).toMatch(new RegExp(`"processed":\\s*${messageCount}\\b`));
    void expect(afterRerun).toMatch(/"cursors":\s*1\b/);
  },
};

/** The CRM demo seed: 3 demo messages plus the extraction-gate Organizations. */
export const Crm: Story = {
  args: { seed: 'crm' },
};

/**
 * The deterministic CRM pipeline over the demo mailbox: every demo sender is at a known
 * Organization, so one run creates one Person (org-linked) and one Profile per sender, records
 * provenance on the Mailbox, and advances a durable feed cursor. A second run is an idempotent
 * catch-up that creates nothing.
 */
export const CrmTest: Story = {
  args: { seed: 'crm' },
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

    // The demo seed lands as one batch of three messages.
    await waitFor((text) => /"messages":\s*3\b/.test(text));

    // First pass: one Person + one Profile per demo sender, all provenance recorded, cursor created.
    await userEvent.click(canvas.getByTestId('crm'));
    const afterFirst = await waitFor((text) => /"runs":\s*1\b/.test(text));
    void expect(afterFirst).toMatch(/"contacts":\s*3\b/);
    void expect(afterFirst).toMatch(/"profiles":\s*3\b/);
    void expect(afterFirst).toMatch(/"linked":\s*3\b/);
    void expect(afterFirst).toMatch(/"cursors":\s*1\b/);

    // Second pass: idempotent catch-up — nothing new is created (`last.contacts` reports 0).
    await userEvent.click(canvas.getByTestId('crm'));
    const afterSecond = await waitFor((text) => /"runs":\s*2\b/.test(text));
    void expect(afterSecond).toMatch(/"profiles":\s*3\b/);
    void expect(afterSecond).toMatch(/"contacts":\s*0\b/);
  },
};
