//
// Copyright 2026 DXOS.org
//

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createBasicExtensions, createMarkdownExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import { Editor, type EditorViewProps } from '../components';
import { paragraphBoxes } from './paragraph-boxes';

type StoryArgs = Pick<EditorViewProps, 'value'>;

const DefaultStory = (props: StoryArgs) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: 'Type here...' }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      paragraphBoxes(),
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
  title: 'ui/react-ui-editor/ParagraphBoxes',
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
    value: trim`
      # Paragraph boxes

      Each paragraph is drawn inside a non-interactive box behind the text; the document stays fully
      editable. Edit any paragraph, add or remove lines, and the boxes re-measure to fit.

      A paragraph is a run of consecutive non-blank lines, so a single blank line starts a new box.
      This second paragraph spans multiple lines to show that the box grows to enclose all of them,
      wrapping included.

      Scroll the editor to confirm the boxes track their paragraphs across viewport changes.

      - List items are lines too, so a tight list reads as one paragraph.
      - Second item.
      - Third item.

      The final paragraph sits on its own.
    `,
  },
};
