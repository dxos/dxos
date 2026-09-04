//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Layout } from '#model';

import { webApp } from '../model/testing';
import { ArchifySvg } from './ArchifySvg';

type StoryArgs = {
  /** Guided view to focus, by id; unset shows the whole diagram. */
  view?: string;
  /** Whether clicking a component traces what it reaches. */
  traceable?: boolean;
};

const DefaultStory = ({ view: viewId, traceable = true }: StoryArgs) => {
  const [selected, setSelected] = useState<string>();
  const view = webApp.meta.views?.find((entry) => entry.id === viewId);
  const focus = selected ? Layout.reach(webApp, [selected], 'both') : view ? new Set(view.focus) : undefined;

  return (
    <ArchifySvg diagram={webApp} focus={focus} selected={selected} onSelect={traceable ? setSelected : undefined} />
  );
};

const meta = {
  title: 'plugins/plugin-archify/components/ArchifySvg',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    view: { control: 'select', options: [undefined, ...(webApp.meta.views ?? []).map((view) => view.id)] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Archify's reference document. Click a component to trace everything it reaches. */
export const Default: Story = { args: {} };

/** A guided view: only the components its author listed stay at full strength. */
export const GuidedView: Story = { args: { view: 'request-path', traceable: false } };
