//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useRef, useState } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as SpecReview from '@dxos/compute/SpecReview';
import { parseReview } from '@dxos/deus/review';
import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { FeatureEditingPlugin, FeatureSeed, queryElement } from '@dxos/plugin-code/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Theme from '@dxos/react-ui/Theme';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { SpecReviews } from '#sync';
import { translations } from '#translations';
import { Feature, FeatureSpec } from '#types';

import PLUGIN_CODE_MDL from '../../../PLUGIN.mdl?raw';
import { type FeatureModel } from '../../components/FeatureCard/index.ts';
import PLUGIN_CODE_EARLIER_REVIEW from '../SpecArticle/__fixtures__/plugin-code.review-2026-10-23.mdl?raw';
import PLUGIN_CODE_REVIEW from '../SpecArticle/__fixtures__/plugin-code.review-2026-10-27.mdl?raw';
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

/** The article with what the feature's description holds beside it, so a story can tell whether viewing wrote it. */
const DescriptionProbeStory = (args: StoryArgs) => {
  const [space] = useSpaces();
  const features = useQuery(space?.db, Filter.type(Feature.Feature));
  const [description] = useObject(
    features.find((feature) => feature.name === args.name),
    'description',
  );
  return (
    <>
      <span data-testid='probe.description'>{typeof description}</span>
      <DefaultStory {...args} />
    </>
  );
};

/** The description probe under a theme a control flips, which rebuilds every bound editor. */
const ThemeToggleStory = (args: StoryArgs) => {
  const { tx } = Theme.useThemeContext();
  const [dark, setDark] = useState(false);
  return (
    <Theme.Provider tx={tx} themeMode={dark ? 'dark' : 'light'}>
      <button
        data-testid='probe.theme'
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setDark((dark) => !dark)}
      >
        theme
      </button>
      <DescriptionProbeStory {...args} />
    </Theme.Provider>
  );
};

/** The article with controls that edit its requirements as a peer would, without taking the focus. */
const PeerAppendStory = (args: StoryArgs) => {
  const [space] = useSpaces();
  const features = useQuery(space?.db, Filter.type(Feature.Feature));
  const feature = features.find((feature) => feature.name === (args.name ?? FEATURE_NAME));
  const [snapshot] = useObject(feature);
  return (
    <>
      <output data-testid='probe.foreign.text' hidden>
        {snapshot?.requirements?.['F-9.9']?.text}
      </output>
      <button
        data-testid='probe.append'
        onMouseDown={(event) => event.preventDefault()}
        onClick={() =>
          feature &&
          Feature.setRequirements(feature, [...Feature.getRequirements(feature), { text: 'Sync stops when offline.' }])
        }
      >
        append
      </button>
      <button
        data-testid='probe.multiline'
        onMouseDown={(event) => event.preventDefault()}
        onClick={() =>
          feature &&
          Feature.setRequirements(
            feature,
            Feature.getRequirements(feature).map((requirement, index) =>
              index === 0 ? { ...requirement, text: 'when: mail arrives\nthen: it shows' } : requirement,
            ),
          )
        }
      >
        multiline
      </button>
      <button
        data-testid='probe.foreign'
        onMouseDown={(event) => event.preventDefault()}
        onClick={() =>
          feature &&
          Obj.update(feature, (feature) => {
            (feature.requirements ??= {})['F-9.9'] = { text: 'Written by another client.' };
            (feature.requirementOrder ??= []).push('F-9.9');
          })
        }
      >
        foreign
      </button>
      <DefaultStory {...args} />
    </>
  );
};

/** plugin-code's own features, read from its spec. */
const PLUGIN_CODE_FEATURES: FeatureModel[] = FeatureSpec.parse(FeatureSpec.split(PLUGIN_CODE_MDL)).map(
  ({ id, name, description, status, requirements }) => ({
    id,
    name,
    description,
    status: status ?? 'planned',
    active: false,
    requirements,
    specs: [`packages/plugins/plugin-code/PLUGIN.mdl#${id}`],
    subfeatures: [],
    code: [],
    dependsOn: [],
    tasks: [],
    showcases: [],
  }),
);

/** The article over plugin-code's features, with two of the spec's reviews from the repository recorded against it. */
const ReviewedStory = (args: StoryArgs) => {
  const [space] = useSpaces();
  const [seeded, setSeeded] = useState(false);
  const seeding = useRef(false);
  useEffect(() => {
    if (space && !seeding.current) {
      seeding.current = true;
      const spec = FeatureSeed.seed(space.db, { name: 'plugin-code', features: PLUGIN_CODE_FEATURES });
      for (const text of [PLUGIN_CODE_EARLIER_REVIEW, PLUGIN_CODE_REVIEW]) {
        const fields = SpecReviews.fromText(text);
        if (typeof fields === 'string') {
          throw new Error(fields);
        }
        space.db.add(SpecReview.make({ spec, ...fields }));
      }
      setSeeded(true);
    }
  }, [space]);
  return seeded ? <DefaultStory {...args} /> : <Loading data={{ seeded }} />;
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
  title: 'plugins/plugin-code/containers/FeatureArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [...FeatureSeed.types, SpecReview.SpecReview],
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
    await expect(await canvas.findByTestId('name', undefined, { timeout: 10_000 })).toHaveTextContent(FEATURE_NAME);
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

/** Enter in a one-line field leaves it, as an input's would. */
export const EnterLeavesField: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByTestId('name', undefined, { timeout: 10_000 });
    const content = queryElement(name, '.cm-content');
    await userEvent.click(content);
    await waitFor(() => expect(name.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(name.contains(document.activeElement)).toBe(false));
    await expect(name).toHaveTextContent(FEATURE_NAME);
  },
};

/** A requirement added and left without text is removed when it loses focus. */
export const EmptyRequirementRemoved: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('name', undefined, { timeout: 10_000 });
    await waitFor(() => expect(canvas.getAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(3));
    await userEvent.click(canvas.getByTestId('requirement-editor.add'));
    await waitFor(() => expect(canvas.getAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(4));
    const added = canvas.getByTestId('requirement-editor.3.text');
    await waitFor(() => expect(added.contains(document.activeElement)).toBe(true));
    await userEvent.click(queryElement(canvas.getByTestId('name'), '.cm-content'));
    await waitFor(() => expect(canvas.getAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(3));
  },
};

/** Viewing a feature without a description writes nothing; focusing the field creates it, and typing fills it. */
export const ViewWritesNothing: Story = {
  render: DescriptionProbeStory,
  args: { name: 'IMAP' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const description = await canvas.findByTestId('description', undefined, { timeout: 10_000 });
    await expect(canvas.getByTestId('probe.description')).toHaveTextContent('undefined');
    await userEvent.click(queryElement(description, '.cm-content'));
    await userEvent.keyboard('Polls');
    await waitFor(() => expect(canvas.getByTestId('probe.description')).toHaveTextContent('string'));
    await waitFor(() => expect(description).toHaveTextContent('Polls'));
  },
};

/** A requirement a peer appends where a removed blank one was does not take the focus from the field being edited. */
export const AppendKeepsFocus: Story = {
  render: PeerAppendStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByTestId('name', undefined, { timeout: 10_000 });
    await waitFor(() => expect(canvas.getAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(3));
    await userEvent.click(canvas.getByTestId('requirement-editor.add'));
    await waitFor(() =>
      expect(canvas.getByTestId('requirement-editor.3.text').contains(document.activeElement)).toBe(true),
    );
    await userEvent.click(queryElement(name, '.cm-content'));
    await waitFor(() => expect(canvas.getAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(3));
    await userEvent.click(canvas.getByTestId('probe.append'));
    await waitFor(() => expect(canvas.getAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(4));
    // The new row's editor is built, so any focus it was going to take has been taken.
    await waitFor(() =>
      expect(canvas.getByTestId('requirement-editor.3.text').querySelector('.cm-content')).not.toBeNull(),
    );
    await expect(name.contains(document.activeElement)).toBe(true);
  },
};

/** A requirement imported with a line in each of its fields takes typing like any other. */
export const MultiLineRequirementEditable: Story = {
  render: PeerAppendStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('name', undefined, { timeout: 10_000 });
    await userEvent.click(canvas.getByTestId('probe.multiline'));
    const row = canvas.getByTestId('requirement-editor.0.text');
    await waitFor(() => expect(row).toHaveTextContent('then: it shows'));
    await userEvent.click(queryElement(row, '.cm-content'));
    await userEvent.keyboard('Z');
    await waitFor(() => expect(row).toHaveTextContent('Z'));
  },
};

/** A field created by focusing it does not take the focus back when a theme change rebuilds it. */
export const RebuildKeepsFocus: Story = {
  render: ThemeToggleStory,
  args: { name: 'IMAP' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByTestId('name', undefined, { timeout: 10_000 });
    const description = canvas.getByTestId('description');
    await userEvent.click(queryElement(description, '.cm-content'));
    await waitFor(() => expect(canvas.getByTestId('probe.description')).toHaveTextContent('string'));
    await waitFor(() => expect(description.contains(document.activeElement)).toBe(true));
    await userEvent.click(queryElement(name, '.cm-content'));
    await waitFor(() => expect(name.contains(document.activeElement)).toBe(true));
    const before = description.querySelector('.cm-content');
    await userEvent.click(canvas.getByTestId('probe.theme'));
    // The description's editor is rebuilt, so any focus it was going to take has been taken.
    await waitFor(() => expect(description.querySelector('.cm-content')).not.toBe(before));
    await expect(description.contains(document.activeElement)).toBe(false);
  },
};

/** A requirement another client stored under a key of its own takes typing into its record like any other. */
export const ForeignKeyEditable: Story = {
  render: PeerAppendStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('name', undefined, { timeout: 10_000 });
    await userEvent.click(canvas.getByTestId('probe.foreign'));
    await waitFor(() => expect(canvas.getAllByTestId(/^requirement-editor\.\d+\.text$/)).toHaveLength(4));
    const row = canvas.getByTestId('requirement-editor.3.text');
    await waitFor(() => expect(row).toHaveTextContent('Written by another client.'));
    await userEvent.click(queryElement(row, '.cm-content'));
    await userEvent.keyboard('Z');
    // The record itself, not only the editor, takes the edit.
    await waitFor(() => expect(canvas.getByTestId('probe.foreign.text').textContent).toContain('Z'));
  },
};

/** Each requirement shows its newest verdict across the spec's reviews, naming that review on hover. */
export const Reviewed: Story = {
  render: ReviewedStory,
  args: { name: 'Stub operations' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId('name', undefined, { timeout: 10_000 });
    const chips = await canvas.findAllByTestId('requirement-editor.verdict', undefined, { timeout: 10_000 });
    await expect(chips.length).toBeGreaterThan(0);
    const { date, commit } = parseReview(PLUGIN_CODE_REVIEW);
    await waitFor(() =>
      expect(chips[0].getAttribute('aria-description')).toContain(`${date} · ${commit?.slice(0, 7)}`),
    );
  },
};
