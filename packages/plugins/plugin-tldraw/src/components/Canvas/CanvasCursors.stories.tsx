//
// Copyright 2026 DXOS.org
//

import '@tldraw/editor/editor.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { type Editor, TldrawEditor } from '@tldraw/editor';
import React, { useCallback, useState } from 'react';
import { expect, waitFor } from 'storybook/test';

import type * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { useCanvasPointer } from './CanvasCursors.tsx';

// The play function drives the editor the story mounts and reads what the hook reported; plain values only, since
// storybook's instrumented `expect` serialises what it is given and an editor is too large to log.
const probe: { editor?: Editor; reports: (ToolkitHooks.Point | undefined)[] } = { reports: [] };
const report = (point: ToolkitHooks.Point | undefined) => {
  probe.reports.push(point);
};
const last = () => (probe.reports.length === 0 ? 'none' : probe.reports.at(-1) === undefined ? 'left' : 'point');

const Pointer = ({ editor }: { editor: Editor }) => {
  useCanvasPointer(editor, report);
  return null;
};

const DefaultStory = () => {
  const [editor, setEditor] = useState<Editor>();
  // A re-run mounts a new editor; the play function must not drive the disposed one.
  useState(() => {
    probe.editor = undefined;
    probe.reports = [];
  });
  const handleMount = useCallback((mounted: Editor) => {
    probe.editor = mounted;
    setEditor(mounted);
  }, []);
  return (
    <div className='dx-expand relative'>
      <TldrawEditor onMount={handleMount} />
      {editor && <Pointer editor={editor} />}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-tldraw/components/CanvasCursors',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The local pointer is shared only while it is over the canvas. */
export const PointerOverCanvas: Story = {
  play: async () => {
    await waitFor(() => expect(probe.editor !== undefined).toBe(true));
    const editor = probe.editor;
    if (!editor) {
      return;
    }

    // Start off the canvas whatever the real pointer is doing, and let the hook unsubscribe.
    editor.updateInstanceState({ isHoveringCanvas: false });
    await waitFor(() => expect(last() === 'point').toBe(false));

    // A refit moves the camera, and tldraw reports that as a pointer move wherever the real pointer is.
    probe.reports = [];
    editor.setCamera({ x: 40, y: 40, z: 1 }, { immediate: true });
    await expect(probe.reports.some((point) => point !== undefined)).toBe(false);

    editor.updateInstanceState({ isHoveringCanvas: true });
    await waitFor(async () => {
      editor.setCamera({ x: editor.getCamera().x + 10, y: 80, z: 1 }, { immediate: true });
      await expect(last()).toBe('point');
    });

    // Switching page under a still pointer moves it to the new page for peers.
    const pageId = editor.getCurrentPageId();
    editor.createPage({ name: 'Second' });
    const second = editor.getPages().find((page) => page.id !== pageId);
    if (second) {
      editor.setCurrentPage(second.id);
    }
    await waitFor(() => expect(probe.reports.at(-1)?.view === second?.id).toBe(true));

    // Moving onto tldraw's toolbar leaves the canvas but stays inside the editor's container.
    editor.updateInstanceState({ isHoveringCanvas: false });
    await waitFor(() => expect(last()).toBe('left'));
  },
};
