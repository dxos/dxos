//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { type ComponentProps } from 'react';

import { StoryRole } from '../modules/index.ts';
import { type ScriptName, Scripts } from '../scripts/index.ts';
import { CalculatorSkill, ModuleContainer, createDecorators, storyParameters } from '../testing/index.ts';

type StoryArgs = ComponentProps<typeof ModuleContainer> & { script: ScriptName };

/**
 * A chat on a scripted model: every script in `src/scripts` that needs no seeded project is served as a model of its
 * own and offered in the model picker, and the chat starts on the one the `script` arg names.
 */
const meta: Meta<StoryArgs> = {
  title: 'stories/stories-assistant/ScriptedModel',
  render: ModuleContainer,
  parameters: storyParameters,
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    // Every script but `buildPlugin`, which needs the project PluginBuild seeds, is offered in the model picker; the
    // chat starts on the one the `script` arg names.
    scriptedModels: {
      scenes: Object.fromEntries(Object.entries(Scripts).filter(([name]) => name !== 'buildPlugin')),
      select: args.script,
    },
    skills: [CalculatorSkill.key],
  })),
  args: { layout: [[StoryRole.Chat]] },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Try "Write me a haiku", or "What is 17 × 23?" for a tool call. */
export const Hello: Story = {
  args: { script: 'hello' },
};
