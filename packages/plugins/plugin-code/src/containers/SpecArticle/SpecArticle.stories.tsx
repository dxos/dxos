//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import * as Spec from '@dxos/compute/Spec';
import * as SpecReview from '@dxos/compute/SpecReview';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { useSpaces } from '@dxos/react-client/echo';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import * as Layout from '@dxos/react-ui/Layout';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { SpecReviews } from '#sync';
import { translations } from '#translations';

import CHESS_1_MDL from '../../../../../reflect/deus/lang/examples/chess-1.mdl?raw';
import CONNECTOR_EVENTS_MDL from '../../../../plugin-connector/spec/EVENTS.mdl?raw';
import GITHUB_FILE_SYNC_MDL from '../../../../plugin-github/spec/FILE-SYNC.mdl?raw';
import GITHUB_SYNC_MDL from '../../../../plugin-github/spec/SYNC.mdl?raw';
import PLUGIN_CODE_MDL from '../../../PLUGIN.mdl?raw';
import { useSpecTexts } from '../../testing/index.ts';
import PLUGIN_CODE_BASE_MDL from './__fixtures__/plugin-code.base.mdl?raw';
import PLUGIN_CODE_EARLIER_REVIEW from './__fixtures__/plugin-code.review-2026-10-23.mdl?raw';
import PLUGIN_CODE_REVIEW from './__fixtures__/plugin-code.review-2026-10-27.mdl?raw';
import { SpecArticle } from './SpecArticle.tsx';
import { SpecPanel } from './SpecPanel.tsx';

const DefaultStory = ({ content }: { content?: string }) => {
  const spaces = useSpaces();
  const space = spaces[0];
  const [spec, setSpec] = useState<Spec.Spec | undefined>();

  useEffect(() => {
    if (space && !spec) {
      setSpec(space.db.add(Spec.make({ name: 'Example spec', content })));
    }
  }, [space, content, spec]);

  if (!spec) {
    return <Loading />;
  }

  // Storybook has no companion, so the panel shows beside the text.
  return <SpecArticle role='article' subject={spec} attendableId='story' panel />;
};

const meta = {
  title: 'plugins/plugin-code/containers/SpecArticle',
  render: (args: { content?: string }) => <DefaultStory {...args} />,
  decorators: [
    // The Review view's verdict list is a Mosaic stack.
    withMosaic(),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    // The article reads the identity and invokes operations, so it needs the client and the plugin manager.
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [Spec.Spec, SpecReview.SpecReview],
          onClientInitialized: ({ client }) => initializeIdentity(client).pipe(Effect.asVoid),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {};

/** plugin-code's spec with two of its reviews from the repository's history, recorded as the spec's SpecReviews. */
const ReviewsStory = () => {
  const [space] = useSpaces();
  const [spec, setSpec] = useState<Spec.Spec | undefined>();

  useEffect(() => {
    if (space && !spec) {
      const added = space.db.add(Spec.make({ name: 'plugin-code/PLUGIN.mdl', content: PLUGIN_CODE_MDL }));
      for (const text of [PLUGIN_CODE_EARLIER_REVIEW, PLUGIN_CODE_REVIEW]) {
        const fields = SpecReviews.fromText(text);
        if (typeof fields === 'string') {
          throw new Error(fields);
        }
        space.db.add(SpecReview.make({ spec: added, ...fields }));
      }
      setSpec(added);
    }
  }, [space, spec]);

  if (!spec) {
    return <Loading />;
  }

  return <SpecArticle role='article' subject={spec} attendableId='story' panel />;
};

/**
 * Each reviewed item shows its newest verdict in the margin, naming its review on hover, and the Review view picks the
 * current status or one review.
 */
export const Reviews: Story = {
  render: () => <ReviewsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('spec-review.gutter-chip').length).toBeGreaterThan(0), {
      timeout: 10_000,
    });
    // A chip with a walkthrough shows a hover card, whose description names the review as the tooltip would.
    const carded = canvas
      .getAllByTestId('spec-review.gutter-chip')
      .filter((chip) => chip.hasAttribute('aria-description'));
    await expect(carded.length).toBeGreaterThan(0);
    for (const chip of carded) {
      await expect(chip.getAttribute('aria-description')).toMatch(/Reviewed 2026-10-2\d at [0-9a-f]{7}$/);
    }
    await userEvent.click(canvas.getByTestId('spec-article.view.review'));
    await waitFor(() => expect(canvas.getAllByTestId('verdict-card').length).toBeGreaterThan(100));
    await expect(canvas.getByTestId('review-panel.summary')).toHaveTextContent(/^136 items/);
  },
};

export const Chess: Story = {
  args: {
    content: CHESS_1_MDL,
  },
};

export const GitHubSync: Story = {
  args: {
    content: GITHUB_SYNC_MDL,
  },
};

export const GitHubFileSync: Story = {
  args: {
    content: GITHUB_FILE_SYNC_MDL,
  },
};

export const ConnectorEvents: Story = {
  args: {
    content: CONNECTOR_EVENTS_MDL,
  },
};

/** plugin-code's spec against an earlier commit of it, opened in diff mode: three new features and their decisions. */
export const Diff: Story = {
  render: () => (
    <SpecArticle
      role='article'
      attendableId='story'
      content={PLUGIN_CODE_MDL}
      base={PLUGIN_CODE_BASE_MDL}
      defaultDiff='base'
    />
  ),
};

/** The spec a packaged page selects for its open tab (sharing-specs `package.py --spec`); unset outside one. */
type SpecTab = { path: string; base: boolean; review: boolean };

const readSpecTab = (): SpecTab | undefined => {
  const tab: unknown = Reflect.get(globalThis, '__DX_SPEC_TAB__');
  if (typeof tab !== 'object' || tab === null) {
    return undefined;
  }
  const path: unknown = Reflect.get(tab, 'path');
  return typeof path === 'string'
    ? { path, base: Reflect.get(tab, 'base') === true, review: Reflect.get(tab, 'review') === true }
    : undefined;
};

const SpecTabStory = ({ tab }: { tab: SpecTab }) => {
  const texts = useSpecTexts({
    content: { path: tab.path, text: '' },
    base: tab.base ? { path: `@base/${tab.path}`, text: '' } : undefined,
    review: tab.review ? { path: tab.path.replace(/\.mdl$/, '.review.mdl'), text: '' } : undefined,
  });
  if (!texts?.content) {
    return <Loading />;
  }

  return (
    <SpecArticle
      role='article'
      attendableId='story'
      content={texts.content}
      base={tab.base ? texts.base : undefined}
      review={texts.review}
      defaultDiff={tab.base ? 'base' : undefined}
    />
  );
};

/**
 * Any spec, chosen by the packaged page at runtime rather than imported into the bundle, so one cached static build
 * renders every spec; without a packaged page it shows plugin-code's own spec.
 */
export const AnySpec: Story = {
  render: () => {
    const tab = readSpecTab();
    return tab ? (
      <SpecTabStory tab={tab} />
    ) : (
      <SpecArticle role='article' attendableId='story' content={PLUGIN_CODE_MDL} />
    );
  },
};

/** The panel apart from the text, as the spec's companion shows it: a decision chip in the margin shows the decision. */
export const Companion: Story = {
  render: () => (
    <Layout.Grid classNames='grid-cols-2 h-full'>
      <SpecArticle role='article' attendableId='story' content={PLUGIN_CODE_MDL} panel={false} />
      <SpecPanel content={PLUGIN_CODE_MDL} />
    </Layout.Grid>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chips = await waitFor(() => canvas.getAllByTestId('spec-changelog.gutter-chip'), { timeout: 10_000 });
    await userEvent.click(chips[0]);
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-testid="spec-article.panel"]')?.getAttribute('data-view')).toBe(
        'ledger',
      ),
    );
  },
};
