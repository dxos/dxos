//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureEditingPlugin, FeatureSeed } from '@dxos/plugin-projects/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';
import { Feature } from '#types';

import { FeatureArticle } from './FeatureArticle.tsx';

const FEATURE_NAME = 'Provider sync';

type StoryArgs = { role: string; attendableId: string; name?: string };

const DefaultStory = ({ role, attendableId, name = FEATURE_NAME }: StoryArgs) => {
  const [space] = useSpaces();
  const features = useQuery(space?.db, Filter.type(Feature.Feature));
  const feature = features.find((feature) => feature.name === name);
  if (!feature) {
    return <Loading data={{ db: !!space?.db, feature: !!feature }} />;
  }

  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <FeatureArticle role={role} subject={feature} attendableId={attendableId} />
    </AttendableContainer>
  );
};

/** Stands in for Inbox: a plugin whose profile says it bundles the spec the seeded feature cites. */
const SpecSourcePlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox'),
    name: 'Inbox',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-inbox',
    spec: 'PLUGIN.mdl',
  }),
).pipe(Plugin.make);

const meta = {
  title: 'plugins/plugin-projects/containers/FeatureArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: FeatureSeed.types,
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                FeatureSeed.seed(defaultSpace.db);
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
        FeatureEditingPlugin.make(),
        SpecSourcePlugin(),
      ],
    }),
    withTheme(),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations, ...formTranslations],
  },
  args: { role: 'article', attendableId: 'test' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The form over the feature's fields and requirements, then its subfeatures, then how it relates to the rest. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByDisplayValue(FEATURE_NAME, undefined, { timeout: 10_000 })).toBeInTheDocument();
    await expect(canvas.getAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(3);
    const subfeatures = within(canvas.getByTestId('feature-article.subfeatures'));
    await expect(await subfeatures.findByText('IMAP')).toBeInTheDocument();
    const relations = within(await canvas.findByTestId('feature-article.relations', undefined, { timeout: 10_000 }));
    await expect(await relations.findByText('OAuth tokens')).toBeInTheDocument();
    await expect(relations.getByText('Compose & send')).toBeInTheDocument();
    await expect(relations.getByText('Move sync to EDGE')).toBeInTheDocument();
    await expect(relations.getByText('First sync of a Gmail inbox')).toBeInTheDocument();
  },
};

const pick = async (canvasElement: HTMLElement, testId: string, label: string) => {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByTestId(testId, undefined, { timeout: 10_000 }));
  // The picker queries the space only once open, so its options arrive after the popup does.
  await userEvent.click(await screen.findByRole('option', { name: new RegExp(label) }, { timeout: 5_000 }));
};

/** A subfeature typed into its field is added as a feature beneath this one. */
export const AddSubfeature: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByTestId('feature-article.add-subfeature', undefined, { timeout: 10_000 });
    await userEvent.type(input, 'Outlook{Enter}');
    const subfeatures = within(canvas.getByTestId('feature-article.subfeatures'));
    await expect(await subfeatures.findByText('Outlook', undefined, { timeout: 5_000 })).toBeInTheDocument();
  },
};

/** A dependency is added from the picker and removed from its row. */
export const EditDependencies: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const relations = within(await canvas.findByTestId('feature-article.relations', undefined, { timeout: 10_000 }));
    await pick(canvasElement, 'feature-article.add-dependency', 'Accounts');
    await expect(await relations.findByText('Accounts', undefined, { timeout: 5_000 })).toBeInTheDocument();
    await userEvent.click(relations.getByRole('button', { name: 'Remove dependency on Accounts' }));
    await waitFor(() => expect(relations.queryByText('Accounts')).toBeNull(), { timeout: 5_000 });
  },
};

/** A dependency that would close a cycle is refused and names the features in it. */
export const RefusedCycle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const relations = within(await canvas.findByTestId('feature-article.relations', undefined, { timeout: 10_000 }));
    await pick(canvasElement, 'feature-article.add-dependency', 'Compose & send');
    await expect(
      await screen.findByText(/Provider sync → Compose & send → Provider sync/, undefined, { timeout: 5_000 }),
    ).toBeInTheDocument();
    await expect(relations.queryAllByRole('button', { name: 'Remove dependency on Compose & send' })).toHaveLength(0);
  },
};

/** Each listed spec is a row that opens it: in the app when a bundled plugin carries it, otherwise on GitHub. */
export const OpenSpec: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('feature-card.spec')).toHaveLength(2), { timeout: 10_000 });
    for (const row of canvas.getAllByTestId('feature-card.spec')) {
      await expect(row.closest('a')).toBeNull();
      await expect(row.textContent).toMatch(/plugin-inbox\/PLUGIN\.mdl/);
    }
    await userEvent.click(canvas.getAllByTestId('feature-card.spec')[0]);
  },
};

/** The DXN code cites the feature by, and the tests and code that cite it, each linking to GitHub at its line. */
export const CodeLinks: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = await canvas.findByTestId('feature-card.link', undefined, { timeout: 10_000 });
    await expect(link.textContent).toMatch(/^dxn:org\.dxos\.plugin\.inbox\.feature\.providerSync#[0-9A-Z]{6}$/);
    await waitFor(() => expect(canvas.getAllByTestId('feature-card.code')).toHaveLength(3), { timeout: 10_000 });
    const [suite] = canvas.getAllByTestId('feature-card.code');
    await expect(suite.closest('a')?.getAttribute('href')).toBe(
      'https://github.com/dxos/dxos/blob/main/packages/plugins/plugin-inbox/src/sync/gmail-sync.test.ts#L24',
    );
    await expect(canvas.queryByTestId('feature-article.set-key')).toBeNull();
  },
};

/** A feature without a key shows no DXN and offers a field to set one. */
export const WithoutKey: Story = {
  args: { name: 'OAuth tokens' },
};

/** A feature without a key offers to set one; once set, the article shows the DXN to cite it by. */
export const SetKey: Story = {
  args: { name: 'OAuth tokens' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByTestId('feature-article.set-key', undefined, { timeout: 10_000 });
    await expect(canvas.queryByTestId('feature-card.link')).toBeNull();
    await userEvent.type(input, 'org.dxos.plugin.connector.feature.oauthTokens{Enter}');
    const link = await canvas.findByTestId('feature-card.link', undefined, { timeout: 5_000 });
    await expect(link.textContent).toMatch(/^dxn:org\.dxos\.plugin\.connector\.feature\.oauthTokens#[0-9A-Z]{6}$/);
    await waitFor(() => expect(canvas.queryByTestId('feature-article.set-key')).toBeNull());
  },
};
