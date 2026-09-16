//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { defaultTemplates, scaffoldProject } from '../../templates/index.ts';
import { CreateProjectPanel } from './CreateProjectPanel.tsx';

const meta: Meta<typeof CreateProjectPanel> = {
  title: 'plugins/plugin-projects/components/CreateProjectPanel',
  component: CreateProjectPanel,
  // An empty plugin manager satisfies the component's unconditional `useCapabilities` hook; the
  // story supplies templates via the prop override.
  decorators: [withTheme(), withLayout({ layout: 'column' }), withPluginManager({ plugins: [] })],
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
    await waitFor(async () => expect(canvas.getByText('Default')).toBeInTheDocument());
    await expect(canvas.getByText('Example Research')).toBeInTheDocument();

    // The template rows share the form's column with the inputs above them: only geometry shows
    // this, since a reserved scroll strip insets the rows without changing the DOM.
    const column = (element: Element) => {
      const { left, right } = element.getBoundingClientRect();
      return [Math.round(left), Math.round(right)];
    };
    const nameColumn = column(canvas.getByTestId('create-project-panel.name-input'));
    await expect(column(canvas.getByTestId('create-project-panel.template-input'))).toEqual(nameColumn);
    for (const option of canvasElement.querySelectorAll('[role="option"]')) {
      await expect(column(option)).toEqual(nameColumn);
    }

    await userEvent.type(await canvas.findByTestId('create-project-panel.name-input'), 'Voyage');
    await userEvent.click(canvas.getByText('Default'));
    await waitFor(async () =>
      expect(args.onCreateObject).toHaveBeenCalledWith({ name: 'Voyage', templateId: 'org.dxos.project.default' }),
    );
  },
};
