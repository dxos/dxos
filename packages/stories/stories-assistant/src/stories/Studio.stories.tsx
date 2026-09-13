//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { within } from 'storybook/test';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, DXN, Filter, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as Frame from '@dxos/plugin-studio/Frame';
import type * as GenerationService from '@dxos/plugin-studio/GenerationService';
import * as Storyboard from '@dxos/plugin-studio/Storyboard';
import * as StudioCapabilities from '@dxos/plugin-studio/StudioCapabilities';
import * as StudioOperation from '@dxos/plugin-studio/StudioOperation';
import * as StudioSkill from '@dxos/plugin-studio/StudioSkill';
import { STUDIO_TASK_TITLE, studioTemplate } from '@dxos/plugin-studio/templates';
import { type Space } from '@dxos/react-client/echo';
import { accessTokensFromEnv } from '@dxos/storybook-testing';

import { StoryRole } from '../modules/index.ts';
import { ModuleContainer, createDecorators, storyParameters, submitPrompt } from '../testing/index.ts';

const { text, toolCall, promptIncludes } = ScriptedLanguageModel;

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Studio',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

// Captured by `onInit` so play functions can assert on the real objects the skill writes.
let storySpace: Space | undefined;

/** Seeds the space with a Studio project from the template (its ledger carries the starter task). */
const seedStudioProject = async ({ space }: { space: Space }) => {
  storySpace = space;
  const project = await EffectEx.runPromise(
    studioTemplate
      .scaffold({ name: 'Studio' })
      .pipe(Effect.provideService(Database.Service, Database.makeService(space.db))),
  );
  space.db.add(project);
  await space.db.flush({ indexes: true });
};

/** The chat works in the project's context, which is what the skill files the storyboard into. */
const bindProject = async ({
  db,
  binder,
}: {
  db: Database.Database;
  binder: { bind: (props: any) => Promise<void> };
}) => {
  const project = await db.query(Filter.type(Project.Project)).first();
  await binder.bind({ objects: [Ref.make(project)] });
};

/** Polls the space until a storyboard satisfies `predicate`. */
const waitForStoryboard = async (
  predicate: (storyboard: Storyboard.Storyboard, frames: Frame.Frame[]) => Promise<boolean>,
  { timeout = 60_000 }: { timeout?: number } = {},
): Promise<Storyboard.Storyboard> => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const storyboards = storySpace ? await storySpace.db.query(Filter.type(Storyboard.Storyboard)).run() : [];
    for (const storyboard of storyboards) {
      const frames = await Promise.all(storyboard.frames.map((ref) => ref.load()));
      if (await predicate(storyboard, frames)) {
        return storyboard;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('timed out waiting for the storyboard');
};

/** A keyless video provider returning a placeholder clip, so the scripted flow completes offline. */
const mockVideoService: GenerationService.GenerationService = {
  kind: 'video',
  id: 'mock-video',
  label: 'Mock video',
  contentType: 'video/mp4',
  requestSchema: Schema.Struct({
    prompt: Schema.String,
    model: Schema.optional(Schema.String.annotate({ title: 'Model' })),
  }),
  defaultRequest: { model: 'mock/v1' },
  generate: async (request) => ({
    variants: [
      {
        contentType: 'video/mp4',
        url: `https://example.com/${encodeURIComponent(String(request.prompt)).slice(0, 24)}.mp4`,
        generation: { provider: 'mock-video', prompt: String(request.prompt) },
      },
    ],
  }),
};

const MockVideoPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.stories.studio.mockVideo'), name: 'Mock video provider' }),
).pipe(
  Plugin.addModule({
    id: 'org.dxos.stories.studio.mockVideo/module',
    provides: [StudioCapabilities.GenerationService],
    activate: () => Effect.succeed([Capability.contribute(StudioCapabilities.GenerationService, mockVideoService)]),
  }),
  Plugin.make,
);

/** The plugin stack: Higgsfield as the live video provider, or an offline mock for the scripted story. */
const makeStoryOptions = (provider: 'higgsfield' | 'mock') => ({
  // Not the assistant skill: its template is the static system prompt, whose text is not in the
  // space — binding it here leaves the clone with a dangling source and every request fails.
  skills: [StudioSkill.key, ProjectSkill.key],
  lazyPlugins: async () => {
    const [
      { MediaArtifact, Variant, Lightbox },
      { SpacePlugin },
      ProjectsPlugin,
      TasksPlugin,
      StudioPlugin,
      HiggsfieldPlugin,
      ConnectorPlugin,
    ] = await Promise.all([
      import('@dxos/plugin-studio'),
      import('@dxos/plugin-space/testing'),
      import('@dxos/plugin-projects/ProjectsPlugin'),
      import('@dxos/plugin-tasks/TasksPlugin'),
      import('@dxos/plugin-studio/StudioPlugin'),
      import('@dxos/plugin-higgsfield/HiggsfieldPlugin'),
      import('@dxos/plugin-connector/ConnectorPlugin'),
    ]);
    return {
      plugins: [
        SpacePlugin({}),
        ProjectsPlugin.make(),
        // Declared in Projects' `dependsOn`, so the manager refuses to resolve it without Tasks.
        TasksPlugin.make(),
        StudioPlugin.make(),
        ConnectorPlugin.make(),
        // The video provider the skill generates with; Higgsfield's credential is seeded below.
        provider === 'higgsfield' ? HiggsfieldPlugin.make() : MockVideoPlugin(),
      ],
      types: [Storyboard.Storyboard, Frame.Frame, MediaArtifact.MediaArtifact, Variant.Variant, Lightbox.Lightbox],
    };
  },
  // `VITE_HIGGSFIELD_CREDENTIALS=<keyId>:<keySecret>` when starting storybook.
  accessTokens:
    provider === 'higgsfield'
      ? accessTokensFromEnv({ 'higgsfield.ai': import.meta.env.VITE_HIGGSFIELD_CREDENTIALS })
      : [],
  onInit: seedStudioProject,
  onChatCreated: bindProject,
});

const sharedArgs = {
  layout: [[StoryRole.Project], [StoryRole.Chat], [AppSurface.deckCompanion('trace')]],
};

/**
 * A Studio project (from the Studio template) with its starter task, bound to a chat over a live
 * model, with Higgsfield as the video provider. Ask the assistant to do the task on the checklist.
 *
 * Test:
 * 1. Wait for the chat prompt to activate (the context chip shows "Studio").
 * 2. Send "Do the task on this project's checklist." — the assistant lists providers, creates a
 *    storyboard, appends three video frames and generates each.
 * 3. The project's Artifacts show the storyboard; opening it shows three frames with their prompts.
 */
export const Default: Story = {
  decorators: createDecorators(makeStoryOptions('higgsfield')),
  args: sharedArgs,
};

/**
 * Live model + Higgsfield: proves the tool path end to end. The provided account may refuse the
 * generation (no credits), in which case the frames still exist with their prompts. Manual (not CI).
 */
export const TestStoryboard: Story = {
  decorators: createDecorators(makeStoryOptions('higgsfield')),
  args: sharedArgs,
  // Live model + provider: opt in with `DX_RUN_MANUAL_TESTS=1` (see stories-assistant/moon.yml).
  tags: ['manual'],
  play: async ({ canvasElement }) => {
    await submitPrompt(canvasElement, "Do the task on this project's checklist.");
    await waitForStoryboard(async (_storyboard, frames) => frames.length >= 3, { timeout: 300_000 });
    // Each frame is a Soul still animated by DoP (minutes each, run in order); wait for the clips
    // and print their URLs — the evidence a reader of the run wants.
    const storyboard = await waitForStoryboard(
      async (_storyboard, frames) => {
        const artifacts = await Promise.all(frames.map((frame) => frame.artifact?.load()));
        // A pending variant (async job) has no url yet; wait for the produced ones.
        const variants = await Promise.all(artifacts.map((artifact) => artifact?.variants?.[0]?.load()));
        return artifacts.length >= 3 && variants.every((variant) => !!variant?.url);
      },
      { timeout: 900_000 },
    );
    const frames = await Promise.all(storyboard.frames.map((ref) => ref.load()));
    for (const frame of frames) {
      const artifact = await frame.artifact?.load();
      const variant = await artifact?.variants?.[0]?.load();
      console.log(`[studio live] ${frame.name}: ${variant?.contentType} ${variant?.url}`);
    }
  },
};

const FRAMES = [
  {
    name: 'The blank canvas',
    prompt: 'A dark editing suite; an empty storyboard fills a wide monitor, slow dolly in.',
  },
  {
    name: 'The prompt becomes a frame',
    prompt: 'Typed words dissolve into a rendered cinematic shot inside a frame, soft glow.',
  },
  {
    name: 'The storyboard plays',
    prompt: 'Three frames light up in sequence and play as one film; the room brightens.',
  },
];

/**
 * Deterministic counterpart to {@link TestStoryboard}: a scripted model walks the studio skill's
 * loop against a mock video provider — list providers, then one create-storyboard with the three
 * frames and generate: true — so the flow is asserted in CI. The project ref is not scripted (the
 * model would read it from its context), so the storyboard is asserted by name.
 */
export const TestStoryboardScripted: Story = {
  decorators: createDecorators({
    ...makeStoryOptions('mock'),
    scripted: [
      {
        name: 'chat-name',
        match: promptIncludes('Suggest a name for this chat'),
        turns: [{ parts: [text('Studio storyboard')] }],
      },
      {
        name: 'plan-reminder',
        match: promptIncludes('Reply with exactly one word'),
        turns: Array.from({ length: 6 }, () => ({ parts: [text('stop')] })),
      },
      {
        name: 'studio',
        match: () => true,
        turns: [
          { parts: [toolCall(Operation.toolName(StudioOperation.ListProviders), { kind: 'video' })] },
          {
            parts: [
              toolCall(Operation.toolName(StudioOperation.CreateStoryboard), {
                name: 'How Studio works',
                frames: FRAMES.map((frame) => ({
                  ...frame,
                  kind: 'video',
                  provider: 'mock-video',
                  config: { model: 'mock/v1' },
                })),
                generate: true,
              }),
            ],
          },
          { parts: [text('Storyboard "How Studio works" has three generated frames.')] },
        ],
      },
    ],
  }),
  args: sharedArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, `Do the task: ${STUDIO_TASK_TITLE}`);

    const storyboard = await waitForStoryboard(async (storyboard, frames) => {
      if (storyboard.name !== 'How Studio works' || frames.length !== 3) {
        return false;
      }
      const artifacts = await Promise.all(frames.map((frame) => frame.artifact?.load()));
      return artifacts.every((artifact) => (artifact?.variants?.length ?? 0) >= 1);
    });
    const frames = await Promise.all(storyboard.frames.map((ref) => ref.load()));
    if (frames.map((frame) => frame.name).join('|') !== FRAMES.map((frame) => frame.name).join('|')) {
      throw new Error(`Unexpected frames: ${frames.map((frame) => frame.name).join(', ')}`);
    }
    await canvas.findByText(/three generated frames/i, {}, { timeout: 30_000 });
  },
};
