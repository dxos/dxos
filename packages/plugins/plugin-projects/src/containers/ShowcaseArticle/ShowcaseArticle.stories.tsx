//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as GitHubPlugin from '@dxos/plugin-github/GitHubPlugin';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { FeatureSeed } from '@dxos/plugin-projects/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { PullRequest } from '@dxos/types';

import { translations } from '#translations';
import { Showcase } from '#types';

import { ShowcaseArticle } from './ShowcaseArticle.tsx';

const SHOWCASE_NAME = 'First sync of a Gmail inbox';

type StoryArgs = { role: string; attendableId: string };

const DefaultStory = ({ role, attendableId }: StoryArgs) => {
  const [space] = useSpaces();
  const showcases = useQuery(space?.db, Filter.type(Showcase.Showcase));
  const showcase = showcases.find((showcase) => showcase.name === SHOWCASE_NAME);
  if (!showcase) {
    return <Loading data={{ db: !!space?.db, showcase: !!showcase }} />;
  }

  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <ShowcaseArticle role={role} subject={showcase} attendableId={attendableId} />
    </AttendableContainer>
  );
};

const meta = {
  title: 'plugins/plugin-projects/containers/ShowcaseArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        // The write-up renders through Markdown's text section, and the PR through GitHub's card.
        MarkdownPlugin.make(),
        GitHubPlugin.make(),
        ClientPlugin.make({
          types: FeatureSeed.types,
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                FeatureSeed.seed(defaultSpace.db);
                const [showcase] = (await defaultSpace.db.query(Filter.type(Showcase.Showcase)).run()).filter(
                  (showcase) => showcase.name === SHOWCASE_NAME,
                );
                const pullRequest = defaultSpace.db.add(
                  PullRequest.make({
                    owner: 'dxos',
                    repo: 'dxos',
                    number: 14031,
                    title: 'projects: feature maps',
                    state: 'open',
                    url: 'https://github.com/dxos/dxos/pull/14031',
                  }),
                );
                Obj.update(showcase, (showcase) => {
                  showcase.pullRequests.push(Ref.make(pullRequest));
                });
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
      ],
      setupEvents: [MarkdownEvents.Start],
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

/** The name, what it demonstrates, the markdown write-up, and the pull request as GitHub's card. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByDisplayValue(SHOWCASE_NAME, undefined, { timeout: 10_000 })).toBeInTheDocument();
    await expect(
      await canvas.findByTestId('showcase-article.target', undefined, { timeout: 10_000 }),
    ).toHaveTextContent('Provider sync');
    await expect(await canvas.findByText('projects: feature maps', undefined, { timeout: 10_000 })).toBeInTheDocument();
  },
};
