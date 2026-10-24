//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ScriptedLanguageModel, SERVICES_CONFIG } from '@dxos/ai/testing';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Feed, Filter, Obj } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import * as AssistantOperation from '@dxos/plugin-assistant/AssistantOperation';
import { AssistantPlugin } from '@dxos/plugin-assistant/testing';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as FilePlugin from '@dxos/plugin-file/FilePlugin';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';
import * as StudioPlugin from '@dxos/plugin-studio/StudioPlugin';
import * as Variant from '@dxos/plugin-studio/Variant';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { File } from '@dxos/types';

import { useSlideImage } from '#hooks';
import { PresenterPlugin } from '#plugin';
import { translations } from '#translations';
import { Presentation, PresenterOperation } from '#types';

import { SlideEditorArticle } from '../containers/SlideEditorArticle/SlideEditorArticle.tsx';
import { FakeImageProviderPlugin } from '../testing/fakeImageProvider.ts';

const PROMPT = 'Add an image of snowy mountains to this slide';
const IMAGE_PROMPT = 'Snowy mountains at dawn';
const REPLY = 'Added an image of snowy mountains to the slide.';

/** The slide editor's markdown: the first editor on the page (the chat's come after it). */
const text = () => document.querySelector('.cm-content')?.textContent ?? '';

/** The shown slide's URI, read when the scripted tool call is emitted (the slide exists only once the story renders). */
let slideUri: string | undefined;

/**
 * The model, scripted: a call offering the slide tool gets the tool call, the call after its result gets the reply,
 * and the harness's side calls (naming the chat) get a line. Only the model is fake; the tool runs for real.
 */
const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  const tool = Operation.toolName(PresenterOperation.GenerateSlideImage);
  if (!request.tools.includes(tool)) {
    return { parts: [ScriptedLanguageModel.text('Slide image')] };
  }
  const answered = request.prompt.content.some((message) => message.role === 'tool');
  return answered
    ? { parts: [ScriptedLanguageModel.text(REPLY)] }
    : { parts: [ScriptedLanguageModel.toolCall(tool, () => ({ slide: slideUri, prompt: IMAGE_PROMPT }))] };
};

/** The slide in its editor, beside the assistant companion bound to that slide. */
const SlideAssistantStory = () => {
  const [space] = useSpaces();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  const slide = useResolveRef(presentation?.slides[0]);
  const content = useResolveRef(slide?.content);
  const text = content && Obj.instanceOf(Text.Text, content) ? content : undefined;
  // The scripted call names the slide on screen, whichever space the story's client listed first.
  slideUri = slide ? Obj.getURI(slide).toString() : undefined;
  const image = useSlideImage(slide);
  const artifact = useResolveRef(slide?.image);
  const variant = useResolveRef(artifact?.variants?.[0]);
  const file = variant?.content;
  const { invokePromise } = Hooks.useOperationInvoker();
  const [chat, setChat] = useState<Chat.Chat>();
  useEffect(() => {
    if (slide) {
      // As the companion does on opening: find or create the slide's chat, bound to the slide (and its skills).
      void invokePromise(
        AssistantOperation.EnsureCompanionChat,
        { companionTo: slide },
        { spaceId: Obj.getDatabase(slide)?.spaceId },
      ).then(({ data }) => setChat(data?.chat));
    }
  }, [slide, invokePromise]);

  if (!slide || !text || !chat) {
    return <Loading />;
  }

  return (
    <div className='flex dx-fill overflow-hidden'>
      {/* The image the slide renders, for the play to read whatever the preview's size. */}
      <span
        hidden
        data-testid='slide.image'
        data-url={image ?? ''}
        data-artifact={slide.image?.uri ?? ''}
        data-file={file?.uri ?? ''}
      />
      {/* Its own box: the article's root lays its parts out as the parent's children. */}
      <div className='flex grow overflow-hidden'>
        <SlideEditorArticle role='article' subject={text} attendableId='slide' />
      </div>
      <div className='flex shrink-0 border-s border-separator overflow-hidden' style={{ width: '32rem' }}>
        <Surface.Surface type={AppSurface.Article} data={{ subject: chat, companionTo: slide }} limit={1} />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/stories/SlideAssistant',
  render: SlideAssistantStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [
        ...CorePlugins.make(),
        ClientPlugin.make({
          types: [
            Presentation.Presentation,
            Presentation.Slide,
            Text.Text,
            Markdown.Document,
            Chat.Chat,
            Feed.Feed,
            MediaArtifact.MediaArtifact,
            Variant.Variant,
            File.File,
          ],
          config: new Config({ runtime: { services: SERVICES_CONFIG.REMOTE } }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              // Storage outlives a story, so a deck seeded by an earlier one is reused rather than doubled.
              const [existing] = yield* Effect.promise(() =>
                space.db.query(Filter.type(Presentation.Presentation)).run(),
              );
              const presentation =
                existing ??
                space.db.add(
                  Presentation.make({ name: 'Alps', slides: ['# The Alps\n\nThe highest range in Europe.'] }),
                );
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        RoutinePlugin(),
        AssistantPlugin({ aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware(script) }),
        PreviewPlugin.make(),
        // The assistant advertises the space tools; without their operations the first tool turn fails.
        SpacePlugin({}),
        // Studio depends on projects, which depends on tasks.
        TasksPlugin.make(),
        ProjectsPlugin.make(),
        StudioPlugin.make(),
        // The tool stores the generated image as a file through plugin-file (inline storage in the story).
        FilePlugin.make(),
        FakeImageProviderPlugin(),
        PresenterPlugin(),
        StorybookPlugin.make({}),
      ],
      capabilities,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SlideAssistantStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Types into the chat prompt (the thread has its own read-only editor, so the prompt's is scoped by its group). */
const submitPrompt = async (canvasElement: HTMLElement, text: string) => {
  const prompt = await waitFor(
    () => {
      const element = canvasElement.querySelector<HTMLElement>('[role="group"] .cm-content');
      if (!element) {
        throw new Error('Prompt editor not found.');
      }
      return element;
    },
    { timeout: 20_000, interval: 300 },
  );
  await userEvent.click(prompt);
  await userEvent.type(prompt, text);
  await userEvent.keyboard('{Enter}');
};

export const Default: Story = {};

/**
 * Asking the assistant beside a slide for an image runs the real `GenerateSlideImage`: the slide gets a generated
 * media artifact whose image is stored as a file through plugin-file, switches to the image layout, and its preview
 * paints the image.
 */
export const GenerateImage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, PROMPT);
    await expect(await canvas.findByText(REPLY, undefined, { timeout: 30_000 })).toBeInTheDocument();
    // The slide holds the generated image (as the preview renders it) and switched to a layout that places it.
    await waitFor(() => expect(canvas.getByTestId('slide.image').getAttribute('data-artifact')).not.toBe(''), {
      timeout: 10_000,
    });
    // The image is stored as a file through plugin-file, and the slide renders it from there.
    await waitFor(() => expect(canvas.getByTestId('slide.image').getAttribute('data-file')).not.toBe(''), {
      timeout: 10_000,
    });
    // A stored inline file renders through an object URL.
    await waitFor(() => expect(canvas.getByTestId('slide.image').getAttribute('data-url')).toMatch(/^blob:/), {
      timeout: 10_000,
    });
    // The preview paints it as the image layout's background.
    await waitFor(() => expect(canvasElement.querySelector('[style*="blob:"]')).not.toBeNull(), { timeout: 10_000 });
    await expect(text()).toContain('layout: image');
  },
};
