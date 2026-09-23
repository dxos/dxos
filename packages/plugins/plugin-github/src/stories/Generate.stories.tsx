//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import React, { useCallback, useMemo, useState } from 'react';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { Button, Field, Icon, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  diffBlocks,
  walkthroughSidebar,
  walkthroughTheme,
} from '@dxos/ui-editor';

// Imported directly rather than through the barrel: that also exports the generation logic, which
// pulls ECHO into a bundle that only needs the pure parsing.
import { fillWalkthrough } from '../walkthrough/fill.ts';
import { SYSTEM_PROMPT, buildPrompt } from '../walkthrough/prompt.ts';
import { fetchPullRequest, parsePullRequestUrl } from './github.ts';

const MODEL = 'com.anthropic.model.claude-sonnet-5.default';

const slots: ThemeExtensionsOptions['slots'] = {
  content: { className: 'dx-container-type-inline-size w-full mx-auto! max-w-[min(72rem,100%-3rem)] py-3!' },
};

type Phase = 'idle' | 'fetching' | 'generating' | 'filling' | 'done';

type Result = {
  body: string;
  covered: number;
  total: number;
};

/**
 * The generation path end to end, against a real pull request: fetch its diff from GitHub, have the
 * model narrate it as placeholder fences, splice the real hunks in, and render the result.
 *
 * The model runs against the live edge service (the `edge-remote` testing preset), so this story
 * needs network but no credentials.
 */
const DefaultStory = ({ url: initialUrl }: { url: string }) => {
  const { themeMode } = useThemeContext();
  const [url, setUrl] = useState(initialUrl);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result>();

  const extensions = useMemo(
    () => [
      createThemeExtensions({ themeMode, slots }),
      createBasicExtensions({ lineWrapping: true, readOnly: true }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      walkthroughTheme(),
      diffBlocks({}),
      walkthroughSidebar({}),
    ],
    [themeMode],
  );
  const { parentRef } = useTextEditor({ initialValue: result?.body ?? '', extensions }, [extensions, result]);

  const handleGenerate = useCallback(async () => {
    const ref = parsePullRequestUrl(url);
    if (!ref) {
      setError('Not a pull request URL: expected https://github.com/owner/repo/pull/123.');
      return;
    }

    setError(undefined);
    setResult(undefined);
    try {
      setPhase('fetching');
      const pullRequest = await fetchPullRequest(ref);

      setPhase('generating');
      // Named rather than spread: `RemotePullRequest.body` is the prompt's `description`, and a
      // spread would drop it without a type error.
      const prompt = buildPrompt({
        ...ref,
        title: pullRequest.title,
        description: pullRequest.body,
        baseBranch: pullRequest.baseBranch,
        headBranch: pullRequest.headBranch,
        diff: pullRequest.diff,
      });
      const { text } = await EffectEx.runPromise(
        LanguageModel.generateText({ prompt: `${SYSTEM_PROMPT}\n\n---\n\n${prompt}` }).pipe(
          Effect.provide(
            Layer.provideMerge(
              AiService.languageModel(MODEL).pipe(Layer.orDie),
              AiServiceTestingPreset('edge-remote').pipe(Layer.orDie),
            ),
          ),
        ),
      );

      // The model names the chunks; the bytes come from the patch it was shown.
      setPhase('filling');
      const filled = fillWalkthrough(text, pullRequest.diff);
      setResult({ body: filled.body, covered: filled.covered, total: filled.total });
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('idle');
    }
  }, [url]);

  const busy = phase !== 'idle' && phase !== 'done';

  return (
    <div className='dx-fill grid grid-rows-[auto_1fr]'>
      <div className='flex items-center gap-2 p-2 border-be border-separator'>
        <Field.Root classNames='flex-1'>
          <Field.Input
            placeholder='https://github.com/owner/repo/pull/123'
            value={url}
            disabled={busy}
            onChange={(event) => setUrl(event.target.value)}
          />
        </Field.Root>
        <Button disabled={busy} onClick={handleGenerate}>
          <Icon
            icon={busy ? 'ph--circle-notch--regular' : 'ph--path--regular'}
            classNames={busy ? 'animate-spin' : ''}
          />
          <span className='ms-2'>{busy ? PHASE_LABEL[phase] : 'Generate'}</span>
        </Button>
        {result && (
          <span className='text-sm text-description whitespace-nowrap'>
            {result.covered} of {result.total} hunks narrated
          </span>
        )}
      </div>
      {error ? (
        <div className='p-4 text-sm text-error-text'>{error}</div>
      ) : (
        <div ref={parentRef} className='dx-fill overflow-auto' />
      )}
    </div>
  );
};

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Generate',
  fetching: 'Fetching the diff',
  generating: 'Writing',
  filling: 'Filling chunks',
  done: 'Generate',
};

const meta = {
  title: 'plugins/plugin-github/stories/Generate',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', controls: { disable: true } },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { url: 'https://github.com/dxos/dxos/pull/13082' },
};
