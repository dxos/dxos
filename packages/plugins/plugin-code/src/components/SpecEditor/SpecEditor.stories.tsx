//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect, fireEvent, waitFor, within } from 'storybook/test';

import { mdl, mdlBlockDescription } from '@dxos/deus/extension';
import { type SourceKey, formatSourceKey } from '@dxos/deus/review';
import { type SpecIndex } from '@dxos/deus/spec-index';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  documentSlots,
  editorClassNames,
} from '@dxos/ui-editor';

import { sourceLinks } from './source-links.ts';

const INDEX: SpecIndex = {
  specs: {
    'org.dxos.story.self': { path: 'packages/story/self/PLUGIN.mdl', items: ['F-1'] },
    'org.dxos.story.alpha': { path: 'packages/story/alpha/PLUGIN.mdl', items: ['F-1', 'Scene'] },
  },
  duplicates: {},
};

const CONTENT = `---
id: org.dxos.story.self
---

# Story

## Dependencies

\`\`\`mdl
uses org.dxos.story.alpha: Draws its scenes.
\`\`\`

## Features

\`\`\`mdl
feat F-1: References
  Renders the scene of org.dxos.story.alpha#Scene, and the missing org.dxos.story.alpha#F-9.
\`\`\`
`;

type ReferencesStoryProps = { content: string; index: SpecIndex };

const ReferencesStory = ({ content, index }: ReferencesStoryProps) => {
  const themeMode = Hooks.useThemeMode();
  const [opened, setOpened] = useState<SourceKey>();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineNumbers: true, readOnly: true }),
      createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }),
      createThemeExtensions({ themeMode, slots: documentSlots }),
      mdl({ index }),
      sourceLinks(setOpened, index),
    ],
    [themeMode, index],
  );

  return (
    <div className='flex flex-col h-full'>
      <div className='grow overflow-auto'>
        <Editor.Root extensions={extensions}>
          <Editor.View classNames={editorClassNames('article')} value={content} />
        </Editor.Root>
      </div>
      <div className='p-2 font-mono text-xs border-t border-separator' data-testid='spec-editor.opened'>
        {opened ? formatSourceKey(opened) : '—'}
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-code/components/SpecEditor',
  component: ReferencesStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof ReferencesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A resolvable reference and dependency are links; a reference to an item the spec lacks is struck through. */
export const References: Story = {
  args: { content: CONTENT, index: INDEX },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('spec-editor.source-link')).toHaveLength(2));
    const broken = canvas.getByTestId('spec-editor.broken-link');
    await expect(broken.title).toBe('`org.dxos.story.alpha` has no item `F-9`.');
    await expect(getComputedStyle(broken).textDecorationLine).toBe('line-through');

    const reference = canvas
      .getAllByTestId('spec-editor.source-link')
      .find((link) => link.textContent === 'org.dxos.story.alpha#Scene');
    await expect(reference).toBeDefined();
    const bounds = reference?.getBoundingClientRect();
    if (reference && bounds) {
      await fireEvent.mouseDown(reference, {
        button: 0,
        metaKey: true,
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + bounds.height / 2,
      });
    }
    await waitFor(() =>
      expect(canvas.getByTestId('spec-editor.opened').textContent).toBe(
        'github:dxos/dxos/packages/story/alpha/PLUGIN.mdl#Scene',
      ),
    );
  },
};
