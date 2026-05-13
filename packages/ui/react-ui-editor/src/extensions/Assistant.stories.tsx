//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import type { Meta, StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import React, { useEffect, useMemo, useState } from 'react';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { useThemeContext } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { compactSlots, createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import { Editor, type EditorViewProps } from '../components';
import { assistant, type AssistantOptions } from './assistant-extension';

// TODO(burdon): Factor out.
const useTestGenerate = () => {
  const [generate, setGenerate] = useState<AssistantOptions['generate']>();
  useEffect(() => {
    let disposed = false;
    const rt = ManagedRuntime.make(
      AiService.model('@anthropic/claude-haiku-4-5').pipe(
        Layer.provide(AiServiceTestingPreset('edge-remote')),
        Layer.orDie,
      ),
    );

    if (!disposed) {
      setGenerate(
        () =>
          ({ instructions, content }: { instructions: string; content: string }) =>
            rt.runPromise(
              Effect.gen(function* () {
                const prompt = [instructions, content].join('\n\n');
                const response = yield* LanguageModel.generateText({ prompt });
                return response.text;
              }),
            ),
      );
    }

    return () => {
      disposed = true;
      void rt.dispose();
    };
  }, []);

  return generate;
};

type DefaultStoryProps = Pick<EditorViewProps, 'value'>;

const DefaultStory = (props: DefaultStoryProps) => {
  const { themeMode } = useThemeContext();
  const generate = useTestGenerate();
  const extensions = useMemo(
    () =>
      generate
        ? [
            createBasicExtensions({ placeholder: 'Type here...' }),
            createThemeExtensions({ themeMode, slots: compactSlots }),
            assistant({ generate }),
          ]
        : [],
    [generate, themeMode],
  );

  if (extensions.length === 0) {
    return <Loading />;
  }

  return (
    <Editor.Root>
      <Editor.View {...props} classNames='dx-container border border-subdued-separator' extensions={extensions} />
    </Editor.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-editor/Assistant',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  tags: ['experimental'],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: trim`
      This text has a speling mistake.

      And it grammatical errors.

      But we can fix it.
    `,
  },
};
