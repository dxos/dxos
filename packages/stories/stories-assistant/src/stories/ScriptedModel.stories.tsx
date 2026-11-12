//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { type ComponentProps } from 'react';

import { StoryRole } from '../modules/index.ts';
import { type ScriptName, Scripts } from '../scripts/index.ts';
import { ModuleContainer, composerScript, createDecorators, storyParameters } from '../testing/index.ts';

type StoryArgs = ComponentProps<typeof ModuleContainer> & { script: ScriptName };

/**
 * A chat on a scripted model: the script named by the `script` arg is served as a model of its own, and the chat starts
 * on it. Scripts live in `src/scripts`, so a different one is a different arg, not a different story.
 */
const meta: Meta<StoryArgs> = {
  title: 'stories/stories-assistant/ScriptedModel',
  render: ModuleContainer,
  parameters: storyParameters,
  decorators: createDecorators<StoryArgs>(({ args }) => ({
    scriptedModel: { name: args.script, script: composerScript(Scripts[args.script]) },
  })),
  args: { layout: [[StoryRole.Chat]] },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Try "Write me a haiku", or "What is 17 × 23?" for a tool call. */
export const Hello: Story = {
  args: { script: 'hello' },
};
