//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { REFERENCE } from '@dxos/brain/testing';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';

import { RulesPanel } from './RulesPanel.tsx';

const meta = {
  title: 'stories/stories-brain/RulesPanel',
  component: RulesPanel,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...editorTranslations] },
} satisfies Meta<typeof RulesPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    source: REFERENCE[3],
    diagnostics: [],
    onSourceChange: () => {},
    onLoadReference: () => {},
  },
};

export const Diagnostics: Story = {
  args: {
    source: 'wake(reply) :- working_on(dima, X), not speaker(G, dima).',
    diagnostics: [
      {
        code: 'vocabulary',
        message: 'working_on is a synonym; shorthand must use the canonical predicate works_on',
        position: { line: 1, column: 16 },
      },
    ],
    onSourceChange: () => {},
  },
};
