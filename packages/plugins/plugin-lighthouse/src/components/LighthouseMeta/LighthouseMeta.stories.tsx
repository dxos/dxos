//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { issuesFixture, pluginsFixture, predicatesFixture, storageFixture } from '../../testing/meta-fixture.ts';
import { LighthouseMeta } from './LighthouseMeta.tsx';
import { metaTranslations } from './translations.ts';

const meta = {
  title: 'plugins/plugin-lighthouse/components/LighthouseMeta',
  component: LighthouseMeta,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, { 'en-US': { [pluginMeta.profile.key]: metaTranslations } }],
  },
  args: {
    plugins: pluginsFixture,
    predicates: predicatesFixture,
    issues: issuesFixture,
    storage: storageFixture,
    prune: { snapshots: 412, bytes: 182_000_000, cited: 1_856, dryRun: true },
    onReload: () => {},
    onComment: () => {},
    onSetStatus: () => {},
    onClearCache: () => {},
    onPrune: () => {},
  },
} satisfies Meta<typeof LighthouseMeta>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plugins: Story = {};

export const Vocabulary: Story = { args: { defaultTab: 'vocabulary' } };

export const Issues: Story = { args: { defaultTab: 'issues' } };

export const Storage: Story = { args: { defaultTab: 'storage', message: 'Cleared 12 cached answers.' } };

export const Offline: Story = {
  args: {
    plugins: [],
    predicates: [],
    issues: [],
    storage: undefined,
    prune: undefined,
    error: 'Lighthouse at http://127.0.0.1:4319 did not answer.',
  },
};
