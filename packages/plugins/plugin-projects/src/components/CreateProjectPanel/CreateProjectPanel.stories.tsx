//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { defaultTemplates, scaffoldProject } from '../../templates';
import { CreateProjectPanel } from './CreateProjectPanel';

const meta: Meta<typeof CreateProjectPanel> = {
  title: 'plugins/plugin-projects/CreateProjectPanel',
  component: CreateProjectPanel,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
  args: {
    // Static templates so the story renders without a plugin manager (no capability context).
    templates: [
      ...defaultTemplates,
      {
        id: 'org.dxos.project.example',
        label: 'Example Research',
        icon: 'ph--flask--regular',
        scaffold: ({ name }) => Effect.succeed(scaffoldProject({ name })),
      },
    ],
    onCreateObject: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => expect(canvas.getByText('Blank')).toBeInTheDocument());
    await expect(canvas.getByText('Example Research')).toBeInTheDocument();

    // Typing a name and picking a template submits both.
    await userEvent.type(await canvas.findByTestId('create-project-panel.name-input'), 'Voyage');
    await userEvent.click(canvas.getByText('Blank'));
    await waitFor(async () =>
      expect(args.onCreateObject).toHaveBeenCalledWith({ name: 'Voyage', templateId: 'org.dxos.project.blank' }),
    );
  },
};
