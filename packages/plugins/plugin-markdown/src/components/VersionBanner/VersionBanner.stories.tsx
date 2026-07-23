//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { translations as spaceTranslations } from '@dxos/plugin-space/translations';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { VersionBanner } from './VersionBanner';

const meta = {
  title: 'plugins/plugin-markdown/components/VersionBanner',
  component: VersionBanner,
  decorators: [withTheme()],
  parameters: {
    translations: [...translations, ...spaceTranslations],
  },
} satisfies Meta<typeof VersionBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checkpoint: Story = {
  args: {
    mode: 'checkpoint',
    name: 'v2 outline',
    timestamp: '2026-07-17T10:00:00.000Z',
    onRestore: fn(),
    onBranchFrom: fn(),
    onClose: fn(),
  },
};

export const Branch: Story = {
  args: {
    mode: 'branch',
    name: 'agent-draft',
    timestamp: '2026-07-19T09:00:00.000Z',
    view: 'branch',
    onViewChange: fn(),
    onClose: fn(),
  },
};

/**
 * A suggestion branch banner tinted with the author's palette hue (the same colour as the author's
 * avatar/tag and the inline suggestion markers). The `[Base | Diff | Branch]` selector switches views.
 */
export const SuggestionBranch: Story = {
  args: {
    mode: 'branch',
    name: 'Alice Mercer',
    hue: 'violet',
    timestamp: '2026-07-19T09:00:00.000Z',
    view: 'branch',
    onViewChange: fn(),
    onClose: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // The author name tag carries the author's hue.
    const tag = await canvas.findByText('Alice Mercer');
    await waitFor(() => expect(tag.closest('[data-hue="violet"]')).not.toBeNull());

    // The three-way view selector renders and switching invokes onViewChange with the chosen view.
    await canvas.findByTestId('version-banner-view-base');
    await userEvent.click(canvas.getByTestId('version-banner-view-diff'));
    await waitFor(() => expect(args.onViewChange).toHaveBeenCalledWith('diff'));
  },
};

export const Fork: Story = {
  args: {
    mode: 'fork',
    name: 'agent-draft',
    timestamp: '2026-07-17T10:00:00.000Z',
    onClose: fn(),
  },
};
