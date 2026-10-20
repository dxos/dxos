//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as FilePlugin from '@dxos/plugin-file/FilePlugin';
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
import { File, PullRequest } from '@dxos/types';

import { translations } from '#translations';
import { Showcase } from '#types';

import { ShowcaseArticle } from './ShowcaseArticle.tsx';

const SHOWCASE_NAME = 'First sync of a Gmail inbox';

const SCREENSHOT = { name: 'inbox.png', width: 640, height: 400 };
const RECORDING = { name: 'sync.webm' };

/** A mock inbox whose rows fill in as `progress` goes from 0 to 1, from one row so the video's poster frame is not blank. */
const drawInbox = (context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, progress: number) => {
  const { width, height } = context.canvas;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#4b3a8a';
  context.fillRect(0, 0, width, 48);
  const rows = Math.max(1, Math.round(6 * progress));
  for (let row = 0; row < rows; row++) {
    context.fillStyle = row % 2 === 0 ? '#e8e4f6' : '#f6f4fb';
    context.fillRect(24, 72 + row * 52, width - 48, 40);
    context.fillStyle = '#8fd3b0';
    context.fillRect(36, 84 + row * 52, 16, 16);
  }
};

/** A PNG screenshot drawn in the browser, so the story carries no binary fixture. */
const makeScreenshot = async (): Promise<Uint8Array> => {
  const canvas = new OffscreenCanvas(SCREENSHOT.width, SCREENSHOT.height);
  const context = canvas.getContext('2d');
  if (context) {
    drawInbox(context, 1);
  }
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
};

/** A one-second WebM of the inbox filling in, from a DOM canvas since only it has `captureStream`. */
const makeRecording = async (): Promise<Uint8Array> => {
  const canvas = document.createElement('canvas');
  canvas.width = SCREENSHOT.width;
  canvas.height = SCREENSHOT.height;
  const context = canvas.getContext('2d');
  const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: 'video/webm' });
  const chunks: globalThis.Blob[] = [];
  recorder.ondataavailable = (event) => chunks.push(event.data);
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const frame = () => {
      const progress = Math.min((performance.now() - start) / 1_000, 1);
      if (context) {
        drawInbox(context, progress);
      }
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
  recorder.stop();
  await stopped;
  return new Uint8Array(await new globalThis.Blob(chunks, { type: 'video/webm' }).arrayBuffer());
};

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
        // The write-up renders through Markdown's text section, the PR through GitHub's card, and the media through File's.
        MarkdownPlugin.make(),
        GitHubPlugin.make(),
        FilePlugin.make(),
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
                // Bytes land in the client's local blob store, so the cards resolve object URLs without EDGE.
                const [screenshot, recording] = await Promise.all([makeScreenshot(), makeRecording()]);
                const files = await Promise.all(
                  [
                    { bytes: screenshot, name: SCREENSHOT.name, type: 'image/png' },
                    { bytes: recording, name: RECORDING.name, type: 'video/webm' },
                  ].map(({ bytes, name, type }) =>
                    EffectEx.runPromise(
                      File.fromBytes(bytes, { name, type }).pipe(
                        Effect.flatMap((file) => Database.add(file)),
                        Effect.provide(Database.layer(defaultSpace.db)),
                      ),
                    ),
                  ),
                );
                Obj.update(showcase, (showcase) => {
                  showcase.artifacts.push(...files.map((file) => Ref.make(file)), Ref.make(pullRequest));
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

/** The name, what it demonstrates, the markdown write-up, and the artifacts: a screenshot, a recording and a PR. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByDisplayValue(SHOWCASE_NAME, undefined, { timeout: 10_000 })).toBeInTheDocument();
    await expect(
      await canvas.findByTestId('showcase-article.target', undefined, { timeout: 10_000 }),
    ).toHaveTextContent('Provider sync');
    await expect(await canvas.findByText('projects: feature maps', undefined, { timeout: 10_000 })).toBeInTheDocument();

    // `naturalWidth` and `readyState` prove the bytes decoded; scoped because the page has other images.
    const artifacts = await canvas.findByRole('region', { name: 'Artifacts' }, { timeout: 10_000 });
    await waitFor(
      async () => {
        const image = artifacts.querySelector('img');
        await expect(image?.getAttribute('src')).toMatch(/^blob:/);
        await expect(image?.naturalWidth).toBe(SCREENSHOT.width);
      },
      { timeout: 10_000 },
    );
    await waitFor(
      async () => {
        const video = artifacts.querySelector('video');
        await expect(video?.getAttribute('src')).toMatch(/^blob:/);
        await expect(video?.readyState).toBeGreaterThanOrEqual(HTMLMediaElement.HAVE_METADATA);
        await expect(video?.videoWidth).toBe(SCREENSHOT.width);
      },
      { timeout: 10_000 },
    );
  },
};
