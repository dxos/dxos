//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Doc } from '@dxos/echo-doc';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Panel, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { ExternalProject, Task } from '@dxos/types';
import { createBasicExtensions, createDataExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { translations } from '#translations';
import { Outline } from '#types';

import { OutlineArticle } from './OutlineArticle';

const CONTENT = [
  '- [ ] Draft the launch announcement',
  '- [ ] Review pricing page',
  '  - [ ] Collect competitor quotes',
  '  - [ ] Update the FAQ',
  '- [ ] Schedule the retro',
].join('\n');

type DefaultStoryProps = {
  content?: string;
  name?: string;
};

const DefaultStory = ({ content, name }: DefaultStoryProps) => {
  const [space] = useSpaces();
  const outline = useMemo(() => space && space.db.add(Outline.make({ name, content })), [space, name, content]);
  if (!outline?.content.target) {
    return null;
  }

  return (
    <div className='dx-container grid grid-cols-2 gap-3 p-3'>
      <div className='dx-expander border border-separator rounded-md overflow-hidden'>
        <OutlineArticle role='article' subject={outline} attendableId='story' />
      </div>
      <div className='dx-expander border border-separator rounded-md overflow-hidden'>
        <SourceView text={outline.content.target} />
      </div>
    </div>
  );
};

/** Editable plain-markdown view of the same text, without the outliner extension. */
const SourceView = ({ text }: { text: Text.Text }) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      id: `${text.id}-source`,
      initialValue: text.content,
      extensions: [
        createDataExtensions({ id: text.id, text: Doc.createAccessor(text, ['content']) }),
        createBasicExtensions({ readOnly: false, lineWrapping: true }),
        createThemeExtensions({ themeMode }),
      ],
    }),
    [text, themeMode],
  );

  return (
    <Panel.Root>
      <Panel.Toolbar />
      <Panel.Content asChild>
        <div ref={parentRef} className='overflow-auto text-sm' />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-outliner/containers/OutlineArticle',
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Text.Text, Outline.Outline, Task.Task, ExternalProject.ExternalProject],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DefaultStory content={CONTENT} name='Launch plan' />,
};

export const Empty: Story = {
  render: () => <DefaultStory />,
};

/**
 * Test:
 * 1. Place the caret on "Review pricing page" and open the floating menu (right of the line).
 * 2. Select "Convert to task"; the line becomes a bullet holding a link chip with the same label.
 * 3. Click the chip; the article swaps to the task form (title/status/priority populated).
 * 4. Edit the title and blur; the value is saved to the task.
 * 5. Click the back arrow in the toolbar to return to the outline.
 * 6. Convert a second line; both tasks reference the same lazily created project.
 */
export const Manual: Story = {
  render: () => <DefaultStory content={CONTENT} name='Launch plan' />,
};
