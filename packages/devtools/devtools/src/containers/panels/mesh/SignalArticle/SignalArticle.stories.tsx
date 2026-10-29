//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SignalArticle } from './SignalArticle.tsx';

const meta = {
  title: 'devtools/devtools/SignalArticle',
  component: SignalArticle,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider()],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SignalArticle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
