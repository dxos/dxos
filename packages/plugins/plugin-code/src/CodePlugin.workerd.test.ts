//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';

import * as CodePlugin from '#meta';
import { CodeOperation, Feature, Showcase } from '#types';

describe('CodePlugin in workerd', () => {
  // Feature maps are driven over MCP, whose hosts activate the plugin headless like this.
  test('activates headless and contributes the feature map operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([
      CodePlugin.make(),
      // Declared plugin dependencies, and theirs; the manager refuses to load the plugin without them.
      ProjectsPlugin.make(),
      AssistantPlugin.make(),
      TasksPlugin.make(),
    ]);
    expect(failures).toEqual([]);
    for (const type of [Feature.Feature, Showcase.Demonstrates]) {
      expect(typenames).toContain(Type.getTypename(type));
    }
    expect(operationKeys).toContain(String(CodeOperation.GetFeatures.meta.key));
  });
});
