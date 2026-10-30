//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import * as Project from '@dxos/compute/Project';
import { Type } from '@dxos/echo';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';

import * as ProjectsPlugin from '#meta';
import { Feature, FeatureOperation, ProjectOperation, Showcase } from '#types';

describe('ProjectsPlugin in workerd', () => {
  test('activates headless and contributes its operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([
      ProjectsPlugin.make(),
      // Declared plugin dependencies; the manager refuses to load the plugin without them.
      AssistantPlugin.make(),
      TasksPlugin.make(),
    ]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(ProjectOperation.Create.meta.key));
    expect(typenames).toContain(Type.getTypename(Project.Project));
    // Feature maps are driven over MCP, whose hosts activate the plugin headless like this.
    for (const type of [Feature.Feature, Showcase.Demonstrates]) {
      expect(typenames).toContain(Type.getTypename(type));
    }
    expect(operationKeys).toContain(String(FeatureOperation.GetFeatures.meta.key));
  });
});
