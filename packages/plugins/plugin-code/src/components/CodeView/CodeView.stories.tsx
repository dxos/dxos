//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { CodeView } from './CodeView.tsx';
import SOURCE from './CodeView.tsx?raw';

const KEY = 'github:dxos/dxos/packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx';
const PATH = 'packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx';

const meta = {
  title: 'plugins/plugin-code/components/CodeView',
  component: CodeView,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
  args: { label: `${KEY}#CodeView`, path: PATH, content: SOURCE, symbol: 'CodeView' },
} satisfies Meta<typeof CodeView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A source file revealed at the symbol a spec's code key names. */
export const Default: Story = {
  args: { onOpenExternal: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('code-view').dataset.symbolLine).toBeDefined());
  },
};

/** A key whose symbol the file does not declare: the file opens at the top with a warning. */
export const SymbolNotFound: Story = {
  args: { label: `${KEY}#missingSymbol`, symbol: 'missingSymbol' },
};

/** The file is still being read. */
export const Loading: Story = {
  args: { content: undefined },
};

/** No local checkout of the key's repository. */
export const NoCheckout: Story = {
  args: { content: undefined, error: 'No local checkout of dxos/dxos.' },
};
