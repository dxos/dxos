//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { type ComponentProps } from 'react';

import { StoryRole } from '../modules/index.ts';
import { type ScriptName, Scripts } from '../scripts/index.ts';
import {
  CalculatorSkill,
  ModuleContainer,
  composerScript,
  createDecorators,
  storyParameters,
} from '../testing/index.ts';

type StoryArgs = ComponentProps<typeof ModuleContainer> & { script: ScriptName };

/**
 * A chat on a scripted model: every script in `src/scripts` is served as a model of its own and offered in the model
 * picker, and the chat starts on the one the `script` arg names.
 */
const meta: Meta<StoryArgs> = {
  title: 'stories/stories-assistant/ScriptedModel',
  render: ModuleContainer,
  parameters: storyParameters,
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    // Every script is offered in the model picker; the chat starts on the one the `script` arg names.
    scriptedModels: {
      scripts: Object.fromEntries(Object.entries(Scripts).map(([name, scene]) => [name, composerScript(scene)])),
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
