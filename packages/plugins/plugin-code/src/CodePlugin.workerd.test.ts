//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';

import * as CodePlugin from '#meta';
import { CodeOperation, Showcase, SpecItem } from '#types';

describe('CodePlugin in workerd', () => {
  // Feature maps are driven over MCP, whose hosts activate the plugin headless like this.
  // Activation imports each plugin's modules lazily, which a cold transform in CI makes slow.
  test(
    'activates headless and contributes the feature map operations and types',
    { timeout: 60_000 },
    async ({ expect }) => {
      const { failures, operationKeys, typenames } = await activateHeadlessPlugins([
        CodePlugin.make(),
        // Declared plugin dependencies, and theirs; the manager refuses to load the plugin without them.
        AssistantPlugin.make(),
        MarkdownPlugin.make(),
        ProjectsPlugin.make(),
        TasksPlugin.make(),
      ]);
      expect(failures).toEqual([]);
      for (const type of [Showcase.Demonstrates, SpecItem.Implements]) {
        expect(typenames).toContain(Type.getTypename(type));
      }
      expect(operationKeys).toContain(String(CodeOperation.LinkTask.meta.key));
    },
  );
});
