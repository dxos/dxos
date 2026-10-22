//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as Operation from '@dxos/compute/Operation';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as AttentionPlugin from '@dxos/plugin-attention/AttentionPlugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import { ProjectsPlugin } from '#plugin';
import { FeatureMapView, ProjectOperation } from '#types';

import { featureSpec } from '../templates/feature-spec.ts';

describe('ProjectOperation.Create', () => {
  test("opens the Features tab in the template's view", async ({ expect }) => {
    await using harness = await setup();
    const space = AppSpace.getDefaultSpace(harness.get(ClientCapabilities.Client));
    invariant(space, 'Expected a default space.');
    const viewState = harness.get(AttentionCapabilities.ViewState);

    const { project } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Spec', templateId: featureSpec.id }, { spaceId: space.id }),
    );
    expect(viewState.get(FeatureMapView.aspect, project.id).mode).toBe('canvas');

    // A template without one leaves the default.
    const { project: plain } = await harness.runPromise(
      Operation.invoke(ProjectOperation.Create, { name: 'Plain' }, { spaceId: space.id }),
    );
    expect(viewState.get(FeatureMapView.aspect, plain.id).mode).toBe('cards');
  });
});

const setup = async () => {
  const harness = await Harness.createComposerTestApp({
    plugins: [
      ClientPlugin.make({}),
      SpacePlugin.make({}),
      AttentionPlugin.make(),
      TasksPlugin.make(),
      AssistantPlugin.make(),
      RoutinePlugin.make(),
      ProjectsPlugin(),
    ],
  });
  const client = harness.get(ClientCapabilities.Client);
  await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesAvailable);
  return harness;
};
