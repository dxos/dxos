//
// Copyright 2026 DXOS.org
//

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { random } from '@dxos/random';
import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  blocks,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

import { translations } from '#translations';

import { Editor, type EditorViewProps } from '../components';

random.seed(123);

type StoryArgs = Pick<EditorViewProps, 'value'>;

const DefaultStory = (props: StoryArgs) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: 'Type here...' }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      blocks(),
    ],
    [themeMode],
  );

  return (
    <Editor.Root>
      <Editor.View {...props} classNames='dx-container' extensions={extensions} />
    </Editor.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-editor/Blocks',
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
    value: Array.from({ length: 30 }, (_, i) => {
      const n = random.number.int(10);
      if (i == 0 || n < 2) {
        return `# Header ${i + 1}`;
      }
      if (n > 8) {
        return Array.from({ length: random.number.int({ min: 2, max: 8 }) }, (_, i) => `- Item ${i + 1}`).join('\n');
      }
      return random.lorem.paragraph();
    }).join('\n\n'),
  },
};
