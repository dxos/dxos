//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SvgBuilder } from '#model';
import { translations } from '#translations';
import { Drawing } from '#types';

import { CreateDrawingPanel, type CreateDrawingPanelProps } from './CreateDrawingPanel.tsx';

/** The panel hands its target on without reading it; an ECHO object cannot be a story arg, which storybook writes to. */
const DefaultStory = (props: Omit<CreateDrawingPanelProps, 'target'>) => {
  const target = useMemo(() => Drawing.makeCanvas({ schema: 'story.sketch/1' }), []);
  return <CreateDrawingPanel {...props} target={target} />;
};

const meta = {
  title: 'plugins/plugin-illustrator/components/CreateDrawingPanel',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'centered' }),
    withPluginManager({ capabilities: [Capability.contribute(AppCapabilities.Translations, translations)] }),
  ],
  args: {
    variants: [{ id: 'story.sketch/1', label: 'Sketch', builder: SvgBuilder }],
    onCreateObject: fn(),
  },
  tags: ['test'],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The caller's defaults (a name typed into a link, say) reach the create as its input. */
export const ForwardsDefaults: Story = {
  args: { initialFormValues: { name: 'Release plan' } },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByTestId('save-button'));
    await waitFor(() =>
      expect(args.onCreateObject).toHaveBeenCalledWith({
        variantId: 'story.sketch/1',
        input: { name: 'Release plan' },
      }),
    );
  },
};
