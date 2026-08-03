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

// `blocks` composes the gutter drag grip (`blockDrag`), the whole-block selection + clipboard
// (`blockSelection`), and the border/background behind selected blocks (`blockSelectionHighlight`).
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

const content = Array.from({ length: 30 }, (_, index) => {
  const roll = random.number.int(10);
  if (index === 0 || roll < 2) {
    return `# Header ${index + 1}`;
  }

  if (roll > 8) {
    return Array.from(
      {
        length: random.number.int({ min: 2, max: 8 }),
      },
      (_, itemIndex) => `- Item ${itemIndex + 1}`,
    ).join('\n');
  }

  return random.lorem.paragraph();
}).join('\n\n');

export const Default: Story = {
  args: { value: content },
};
