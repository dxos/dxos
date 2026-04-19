//
// Copyright 2026 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import type { Meta, StoryObj } from '@storybook/react-vite';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as Runtime from 'effect/Runtime';
import React, { useEffect, useMemo, useState } from 'react';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { log } from '@dxos/log';
import { useThemeContext } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { compactSlots, createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { Editor, type EditorViewProps } from '../components';
import { translations } from '../translations';
import { assistant } from './assistant-extension';

// TODO(burdon): Factor out.
const useTestRuntime = () => {
  const [runtime, setRuntime] = useState<Runtime.Runtime<LanguageModel.LanguageModel>>();
  useEffect(() => {
    let disposed = false;
    const rt = ManagedRuntime.make(
      AiService.model('@anthropic/claude-haiku-4-5').pipe(
        Layer.provide(AiServiceTestingPreset('edge-remote')),
        Layer.orDie,
      ),
    );

    queueMicrotask(async () => {
      try {
        if (!disposed) {
          const runtime = await rt.runtime();
          if (!disposed) {
            setRuntime(runtime);
          }
        }
      } catch (err) {
        log.catch(err);
      }
    });

    return () => {
      disposed = true;
      void rt.dispose();
    };
  }, []);

  return runtime;
};

type DefaultStoryProps = Pick<EditorViewProps, 'value'>;

const DefaultStory = (props: DefaultStoryProps) => {
  const { themeMode } = useThemeContext();
  const runtime = useTestRuntime();
  const extensions = useMemo(
    () =>
      runtime
        ? [
            createBasicExtensions({ placeholder: 'Type here...' }),
            createThemeExtensions({ themeMode, slots: compactSlots }),
            assistant({ runtime }),
          ]
        : [],
    [runtime],
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
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 'This text has a speling mistake.',
  },
};
