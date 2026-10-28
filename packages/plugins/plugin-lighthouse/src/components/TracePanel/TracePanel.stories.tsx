//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { explainFixture } from '../../testing/explain-fixture.ts';
import { TracePanel } from './TracePanel.tsx';
import { traceTranslations } from './translations.ts';

const meta = {
  title: 'plugins/plugin-lighthouse/components/TracePanel',
  component: TracePanel,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'h-[48rem] w-[64rem]' })],
  parameters: {
    translations: [...translations, { 'en-US': { [pluginMeta.profile.key]: traceTranslations } }],
  },
} satisfies Meta<typeof TracePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A real Quick session's first input: turns, tool calls, loads, extractions and folded System One runs. */
export const Default: Story = { args: { tree: explainFixture } };

export const Loading: Story = { args: { loading: true } };

export const Failed: Story = { args: { error: 'No trace for web-20261028-120000.' } };
