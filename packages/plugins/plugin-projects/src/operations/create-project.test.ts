//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as AttentionPlugin from '@dxos/plugin-attention/AttentionPlugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as TestingHarness from '@dxos/plugin-testing/Harness';

import * as ProjectsPlugin from '#meta';
import { FeatureMapView, ProjectCapabilities, ProjectOperation } from '#types';

import { featureSpec } from '../templates/feature-spec.ts';

await TestingHarness.preload({
  plugins: [
    ClientPlugin.make({}),
    SpacePlugin.make({}),
    AttentionPlugin.make(),
    AssistantPlugin.make(),
    TasksPlugin.make(),
    ProjectsPlugin.make(),
  ],
});

describe('ProjectOperation.Create', () => {
  test('scaffolds the owned graph and files it with one cascading add', async ({ expect }) => {
    await using harness = await setup();

    const { id, project } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Voyage' }, { spaceId: spaceId(harness) }),
    );

    expect(id).toBeTypeOf('string');
    expect(project.name).toBe('Voyage');
    const instructions = await project.instructions?.tryLoad();
    const taskSet = await project.taskSet?.tryLoad();
    const outline = await project.outline?.tryLoad();
    invariant(instructions && taskSet && outline, 'Expected the scaffolded children.');
    expect(Obj.getParent(instructions)?.id).toBe(project.id);
    expect(Obj.getParent(taskSet)?.id).toBe(project.id);
    expect(Obj.getParent(outline)?.id).toBe(project.id);
    expect(project.artifacts).toEqual([]);
  });

  test('the returned subject path addresses the project in the space graph', async ({ expect }) => {
    await using harness = await setup();

    const { subject } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Voyage' }, { spaceId: spaceId(harness) }),
    );

    expect(subject).toHaveLength(1);
    expect(subject[0]).toContain(spaceId(harness));
  });

  test('an unknown template id is rejected rather than silently falling back to the default', async ({ expect }) => {
    await using harness = await setup();

    const exit = await harness.runPromise(
      Operation.invoke(
        ProjectOperation.Create,
        { name: 'Voyage', templateId: 'org.dxos.project.doesNotExist' },
        { spaceId: spaceId(harness) },
      ).pipe(Effect.exit),
    );

    expect(exit._tag).toBe('Failure');
    expect(String(exit)).toContain('Unknown project template');
  });

  test('an unnamed template resolves to the default', async ({ expect }) => {
    await using harness = await setup();

    const templates = harness.getAll(ProjectCapabilities.Template);
    expect(templates.map((template) => template.id)).toContain(ProjectCapabilities.DefaultTemplateId);

    const { project } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Unnamed' }, { spaceId: spaceId(harness) }),
    );

    const instructions = await project.instructions?.tryLoad();
    invariant(instructions, 'Expected the default template to seed instructions.');
    const body = await instructions.text.load();
    expect(body.content).toContain('assistant focused on this project');
  });

  test('the project is queryable in the space after the create', async ({ expect }) => {
    await using harness = await setup();

    await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Voyage' }, { spaceId: spaceId(harness) }),
    );

    const space = defaultSpace(harness);
    const projects = await space.db.query(Filter.type(Project.Project)).run();
    expect(projects.map((project) => project.name)).toEqual(['Voyage']);
  });

  test("opens the Features tab in the template's view", async ({ expect }) => {
    await using harness = await setup();
    const viewState = harness.get(AttentionCapabilities.ViewState);

    const { project } = await harness.runPromise(
      Operation.invoke(
        ProjectOperation.Create,
        { name: 'Spec', templateId: featureSpec.id },
        { spaceId: spaceId(harness) },
      ),
    );
    expect(viewState.get(FeatureMapView.aspect, project.id).mode).toBe('canvas');

    // A template without one leaves the default.
    const { project: plain } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Plain' }, { spaceId: spaceId(harness) }),
    );
    expect(viewState.get(FeatureMapView.aspect, plain.id).mode).toBe('cards');
  });
});

type Harness = Awaited<ReturnType<typeof TestingHarness.createComposerTestApp>>;

const setup = async (): Promise<Harness> => {
  const harness = await TestingHarness.createComposerTestApp({
    // Tasks is declared in `dependsOn`, so the manager refuses to resolve Projects without it.
    // Assistant and Tasks are declared in Projects' `dependsOn`, so the manager refuses to resolve
    // Projects without them.
    plugins: [
      ClientPlugin.make({}),
      SpacePlugin.make({}),
      // Holds the view state a template's initial Features view is written to.
      AttentionPlugin.make(),
      AssistantPlugin.make(),
      TasksPlugin.make(),
      ProjectsPlugin.make(),
    ],
  });
  const client = harness.get(ClientCapabilities.Client);
  await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesAvailable);
  return harness;
};

const defaultSpace = (harness: Harness) => {
  const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
  invariant(space, 'Expected a default space.');
  return space;
};

const spaceId = (harness: Harness) => defaultSpace(harness).id;
