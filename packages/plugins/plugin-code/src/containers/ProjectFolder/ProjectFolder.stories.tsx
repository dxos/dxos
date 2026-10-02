//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as Project from '@dxos/compute/Project';
import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { CodeCapabilities, type Settings } from '#types';

import { ProjectFolder } from './ProjectFolder.tsx';

const FOLDER = '/Users/me/code/voyage';

const project = Project.make({ name: 'Voyage' });
const settings = Atom.make<Settings.Settings>({ agentRepositories: { [project.id]: FOLDER } }).pipe(Atom.keepAlive);

const meta = {
  title: 'plugins/plugin-code/containers/ProjectFolder',
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
    withPluginManager({ capabilities: [Capability.contribute(CodeCapabilities.Settings, settings)] }),
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
    await expect(await canvas.findByText(FOLDER)).toBeInTheDocument();
    await expect(canvas.getByText('Choose folder…')).toBeInTheDocument();

    // Clearing forgets the folder for this project only, leaving the choice to be made again.
    await userEvent.click(canvas.getByText('Clear'));
    await waitFor(async () => expect(canvas.getByText('Not set')).toBeInTheDocument());
    await expect(canvas.queryByText('Clear')).toBeNull();
  },
};
