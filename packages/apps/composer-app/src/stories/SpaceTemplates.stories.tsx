//
// Copyright 2026 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import React, { useEffect, useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Annotation, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as AttentionPlugin from '@dxos/plugin-attention/AttentionPlugin';
import * as BoardPlugin from '@dxos/plugin-board/BoardPlugin';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import * as CrmPlugin from '@dxos/plugin-crm/CrmPlugin';
import * as DebugPlugin from '@dxos/plugin-debug/DebugPlugin';
import * as DeckPlugin from '@dxos/plugin-deck/DeckPlugin';
import * as GamePlugin from '@dxos/plugin-game/GamePlugin';
import * as GraphPlugin from '@dxos/plugin-graph/GraphPlugin';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';
import * as KanbanPlugin from '@dxos/plugin-kanban/KanbanPlugin';
import * as MagazinePlugin from '@dxos/plugin-magazine/MagazinePlugin';
import * as MapPlugin from '@dxos/plugin-map/MapPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as NavTreePlugin from '@dxos/plugin-navtree/NavTreePlugin';
import * as PipelinePlugin from '@dxos/plugin-pipeline/PipelinePlugin';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import * as PreviewPlugin from '@dxos/plugin-preview/PreviewPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as ReviewPlugin from '@dxos/plugin-review/ReviewPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as ScriptPlugin from '@dxos/plugin-script/ScriptPlugin';
import * as SettingsPlugin from '@dxos/plugin-settings/SettingsPlugin';
import * as SheetPlugin from '@dxos/plugin-sheet/SheetPlugin';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as SpacetimePlugin from '@dxos/plugin-spacetime/SpacetimePlugin';
import * as TablePlugin from '@dxos/plugin-table/TablePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as ThemePlugin from '@dxos/plugin-theme/ThemePlugin';
import * as ThreadPlugin from '@dxos/plugin-thread/ThreadPlugin';
import * as VoxelPlugin from '@dxos/plugin-voxel/VoxelPlugin';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { isNonNullable } from '@dxos/util';

/** Ids of the templates contributed as `AppCapabilities.SpaceTemplate` by the plugins below. */
const TEMPLATES = {
  aiBriefing: 'org.dxos.plugin.magazine.template.ai-briefing',
  architecture: 'org.dxos.plugin.canvas.template.architecture',
  demo: 'org.dxos.plugin-debug.template.demo',
  fieldstone: 'org.dxos.plugin-debug.template.fieldstone',
  incident: 'org.dxos.plugin-debug.template.incident',
  presenter: 'org.dxos.plugin-debug.template.presenter',
  sales: 'org.dxos.plugin.sheet.template.sales',
  pipeline: 'org.dxos.plugin-debug.template.pipeline',
  review: 'org.dxos.plugin-debug.template.review',
  stockfish: 'org.dxos.plugin-debug.template.stockfish',
  tidepool: 'org.dxos.plugin-debug.template.tidepool',
  timeline: 'org.dxos.plugin-debug.template.timeline',
  weather: 'org.dxos.plugin-debug.template.weather',
  worker: 'org.dxos.plugin-debug.template.worker',
} as const;

const STATUS_TEST_ID = 'spaceTemplates.status';
const LABEL_TEST_ID = 'spaceTemplates.label';
const HEADING_TEST_ID = 'treeItem.heading';
const COLLECTIONS_TEST_ID = 'spacePlugin.collectionsSection';

/** Template application can take tens of seconds on a cold module graph. */
const TIMEOUT = 60_000;

/** Where a pending story is waiting, so a stall names its step instead of reading `pending`. */
type Phase = 'identity' | 'create' | 'open';

type TemplateState =
  | { status: 'pending'; phase: Phase }
  | { status: 'ready'; spaceId: string; labels: string[]; objects: number }
  | { status: 'error'; message: string };

/**
 * What the template wrote: the labels of the root collection's objects (the navtree's Collections
 * section) and the number of objects besides the root collection itself.
 */
const getTemplateContent = async (space: Space): Promise<{ labels: string[]; objects: number }> => {
  const ref = Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined);
  const collection = await ref?.load();
  const children = await Promise.all((collection?.objects ?? []).map((object) => object.load()));
  const objects = await space.db.query(Filter.everything()).run();
  return {
    labels: children.map((object) => Obj.getLabel(object)).filter(isNonNullable),
    objects: objects.filter((object) => object.id !== collection?.id).length,
  };
};

/**
 * Creates a space from the template through `space.create` — the path the Create Space dialog
 * takes — and opens it in the deck, so its navtree and objects can be browsed.
 */
const TemplateSpace = ({ template }: { template: string }) => {
  const client = useClient();
  const identity = useIdentity();
  const { invokePromise } = Hooks.useOperationInvoker();
  const [state, setState] = useState<TemplateState>({ status: 'pending', phase: 'identity' });
  // Guards against re-entry while the create is in flight across re-renders.
  const started = useRef(false);

  useEffect(() => {
    if (!identity || started.current) {
      return;
    }

    started.current = true;
    void (async () => {
      try {
        setState({ status: 'pending', phase: 'create' });
        const created = await invokePromise(SpaceOperation.Create, { template });
        if (created.error || !created.data) {
          throw created.error ?? new Error(`Space was not created: ${template}`);
        }

        const space = client.spaces.get(created.data.space.id);
        if (!space) {
          throw new Error(`Created space is not in the client: ${template}`);
        }

        setState({ status: 'pending', phase: 'open' });
        await space.waitUntilReady();
        await invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) });
        setState({ status: 'ready', spaceId: space.id, ...(await getTemplateContent(space)) });
      } catch (error) {
        // The status element is hidden, so the console is where a failed template shows up.
        log.error('space template failed', { template, error });
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      }
    })();
  }, [client, identity, invokePromise, template]);

  return (
    <div
      // Hidden: the play test reads the state from these attributes, and the story shows only the app.
      hidden
      data-testid={STATUS_TEST_ID}
      data-status={state.status}
      data-phase={state.status === 'pending' ? state.phase : undefined}
      data-objects={state.status === 'ready' ? state.objects : undefined}
    >
      <div>{template}</div>
      {state.status === 'error' && <div>{state.message}</div>}
      {state.status === 'ready' &&
        state.labels.map((label) => (
          <div key={label} data-testid={LABEL_TEST_ID}>
            {label}
          </div>
        ))}
    </div>
  );
};

/** The path storybook serves the preview from. */
const IFRAME_PATH = '/iframe.html';

const resetIframePath = () => {
  if (window.location.pathname !== IFRAME_PATH) {
    window.history.replaceState(null, '', `${IFRAME_PATH}${window.location.search}`);
  }
};

/**
 * The deck keeps its navigation in the address bar (`/w/<space>/…`), which inside storybook is the
 * preview iframe's own location, so a remount (HMR, an arg change) would boot the new ephemeral
 * client against the previous client's workspace. The reset runs during render, ahead of the
 * plugin manager's effects that boot the deck.
 */
const withIframePath: Decorator = (Story) => {
  resetIframePath();
  useEffect(() => resetIframePath, []);
  return <Story />;
};

type StoryArgs = { template: string };

type StoryParameters = {
  aiServiceMiddleware?: (aiService: AiService.Service) => AiService.Service;
};

const anonymousEdgeAiService = (): AiService.Service => {
  const remote = Layer.orDie(AiServiceTestingPreset('edge-remote'));
  const resolveRemote = <A, E>(resolve: (service: AiService.Service) => Layer.Layer<A, E>) =>
    Layer.unwrap(Effect.map(AiService.tag, resolve)).pipe(Layer.provide(remote));
  return AiService.make({
    languageModel: (model, options) => resolveRemote((service) => service.languageModel(model, options)),
    decisionModel: (model, options) => resolveRemote((service) => service.decisionModel(model, options)),
  });
};

const meta = {
  title: 'apps/composer-app/SpaceTemplates',
  render: ({ template }) => <TemplateSpace template={template} />,
  decorators: [
    withPluginManager<StoryArgs>(({ parameters }) => ({
      plugins: [
        // Core: the subset of `getCorePlugins` the deck and navtree need, without onboarding,
        // observability or the PWA, which assume a real deployment.
        AttentionPlugin.make(),
        ClientPlugin.make({
          onClientInitialized: ({ client }) => initializeIdentity(client),
        }),
        ConnectorPlugin.make(),
        DeckPlugin.make({ platform: 'desktop' }),
        GraphPlugin.make(),
        NavTreePlugin.make(),
        PreviewPlugin.make(),
        ProcessManagerPlugin.make(),
        RoutinePlugin.make(),
        SettingsPlugin.make(),
        SpacePlugin.make({}),
        ThemePlugin.make({ appName: 'Composer', platform: 'desktop' }),

        // Content: the plugins whose objects the templates seed, and which contribute them.
        // Required by projects and chess respectively.
        AssistantPlugin.make({ aiServiceMiddleware: parameters.aiServiceMiddleware }),
        GamePlugin.make(),
        BoardPlugin.make(),
        CanvasPlugin.make(),
        ChessPlugin.make(),
        CrmPlugin.make(),
        DebugPlugin.make({}),
        IllustratorPlugin.make(),
        InboxPlugin.make(),
        KanbanPlugin.make(),
        MagazinePlugin.make(),
        MapPlugin.make(),
        MarkdownPlugin.make(),
        PipelinePlugin.make(),
        PresenterPlugin.make(),
        ProjectsPlugin.make(),
        ReviewPlugin.make(),
        ScriptPlugin.make(),
        SheetPlugin.make(),
        SpacetimePlugin.make(),
        TablePlugin.make(),
        TasksPlugin.make(),
        ThreadPlugin.make(),
        VoxelPlugin.make(),
      ],
    })),
    withIframePath,
  ],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    template: {
      control: 'select',
      options: Object.values(TEMPLATES),
    },
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Asserts the template applied without error and wrote objects, and that the navtree's Collections
 * section lists every labelled collection the template added to the space root.
 */
const play: Story['play'] = async ({ canvasElement }) => {
  const body = within(canvasElement.ownerDocument.body);
  const status = await body.findByTestId(STATUS_TEST_ID, undefined, { timeout: TIMEOUT });
  await waitFor(() => expect(status.dataset.status, `stalled in phase: ${status.dataset.phase}`).not.toBe('pending'), {
    timeout: TIMEOUT,
  });
  await expect(status.dataset.status, status.textContent ?? '').toBe('ready');

  const labels = within(status)
    .queryAllByTestId(LABEL_TEST_ID)
    .map((element) => element.textContent ?? '');
  await expect(Number(status.dataset.objects)).toBeGreaterThan(0);
  if (labels.length === 0) {
    return;
  }

  // The section starts collapsed; its branch trigger is the only control that discloses it.
  const section = await body.findByTestId(COLLECTIONS_TEST_ID, undefined, { timeout: TIMEOUT });
  if (section.getAttribute('aria-expanded') !== 'true') {
    const trigger = section.querySelector<HTMLElement>('.dx-tree-branch-trigger');
    await expect(trigger).not.toBeNull();
    trigger?.click();
  }

  await waitFor(
    async () => {
      const headings = body.queryAllByTestId(HEADING_TEST_ID).map((element) => element.textContent?.trim());
      for (const label of labels) {
        await expect(headings).toContain(label);
      }
    },
    { timeout: TIMEOUT },
  );
};

export const AiBriefing: Story = {
  args: { template: TEMPLATES.aiBriefing },
  parameters: { aiServiceMiddleware: anonymousEdgeAiService } satisfies StoryParameters,
  play,
};

export const Architecture: Story = { args: { template: TEMPLATES.architecture }, play };

export const Demo: Story = { args: { template: TEMPLATES.demo }, play };

export const AlienLabs: Story = { args: { template: TEMPLATES.fieldstone }, play };

export const HelloWorker: Story = { args: { template: TEMPLATES.worker }, play };

export const Incident: Story = { args: { template: TEMPLATES.incident }, play };

/** The Macro events sheet, its timeline chart and a deck that presents the chart. */
export const Presenter: Story = { args: { template: TEMPLATES.presenter }, play };

export const Sales: Story = { args: { template: TEMPLATES.sales }, play };

export const Pipeline: Story = { args: { template: TEMPLATES.pipeline }, play };

export const Review: Story = { args: { template: TEMPLATES.review }, play };

export const Stockfish: Story = { args: { template: TEMPLATES.stockfish }, play };

export const Tidepool: Story = { args: { template: TEMPLATES.tidepool }, play };

/** The timeline chart's project: its feature map and open tasks. */
export const TimelineProject: Story = { args: { template: TEMPLATES.timeline }, play };

export const Weather: Story = { args: { template: TEMPLATES.weather }, play };
