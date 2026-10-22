//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as Project from '@dxos/compute/Project';
import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { ClaudeCapabilities, type State } from '#types';

import { AgentError } from '../../errors.ts';
import { ProjectFolder } from './ProjectFolder.tsx';

const FOLDER = '/Users/me/code/voyage';

const project = Project.make({ name: 'Voyage' });
const state = Atom.make<State.State>({ repositories: { [project.id]: FOLDER } }).pipe(Atom.keepAlive);

/** The folder is offered only where an agent host exists; this one is never asked to start anything. */
const unused = Effect.fail(new AgentError({ message: 'not available in a story' }));
const agentHelper: ClaudeCapabilities.AgentHelper = {
  agents: Effect.succeed([]),
  defaultFolder: Effect.succeed(undefined),
  connect: () => unused,
  worktrees: { ensure: () => unused, remove: () => unused, list: Effect.succeed([]) },
  mcp: { serve: () => unused, close: () => Effect.void },
};

const meta = {
  title: 'plugins/plugin-claude/containers/ProjectFolder',
  // The project overview renders its settings inside its own form, as here.
  render: () => (
    <Form.Root schema={Schema.Struct({})} values={{}}>
      <Form.Content>
        <ProjectFolder project={project} />
      </Form.Content>
    </Form.Root>
  ),
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(ClaudeCapabilities.State, state),
        Capability.contribute(ClaudeCapabilities.AgentHelper, agentHelper),
      ],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Outside the desktop app there is no folder picker, so the path is typed.
    const field = await canvas.findByTestId('codePlugin.projectFolder.path');
    await expect(field).toHaveValue(FOLDER);

    // Clearing forgets the folder for this project only, leaving the choice to be made again.
    await userEvent.click(canvas.getByText('Clear'));
    await waitFor(async () => expect(canvas.getByTestId('codePlugin.projectFolder.path')).toHaveValue(''));
    await expect(canvas.queryByText('Clear')).toBeNull();
  },
};
