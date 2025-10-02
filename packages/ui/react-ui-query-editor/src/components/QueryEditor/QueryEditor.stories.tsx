//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from '@storybook/test';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { type QueryTag } from './query-editor-extension';
import { QueryEditor } from './QueryEditor';

const allTags: QueryTag[] = [
  { id: 'cloudflare', label: 'Cloudflare', hue: 'amber' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'dxos', label: 'DXOS', hue: 'green' },
  { id: 'blue-yard', label: 'Blue Yard', hue: 'blue' },
  { id: 'effect', label: 'Effect' },
  { id: 'github', label: 'GitHub' },
  { id: 'socket-supply', label: 'Socket Supply', hue: 'indigo' },
];

const meta = {
  title: 'ui/react-ui-query-editor/QueryEditor',
  component: QueryEditor,
  render: ({ items: initialItems }) => {
    const [items, setItems] = useState(initialItems ?? []);
    const [selected, setSelected] = useState<string>();
    // TODO(burdon): Line height.
    // TODO(burdon): Wrap option.
    return (
      <div className='w-[20rem] space-y-2'>
        <div className='flex p-1 border items-center border-separator'>
          <QueryEditor
            items={items}
            onSearch={(text, ids) =>
              allTags.filter(
                ({ id, label }) => ids.indexOf(id) === -1 && label.toLowerCase().includes(text.toLowerCase()),
              )
            }
            onChange={fn()}
          />
        </div>
        <div className='flex flex-col h-[20rem] p-2 text-xs border border-separator'>
          <pre>{JSON.stringify({ items, selected }, null, 2)}</pre>
        </div>
      </div>
    );
  },
  decorators: [withTheme, withLayout()],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof QueryEditor>;

export const Default: Story = {
  args: {
    items: [allTags[0], { content: 'Junie' }, allTags[1]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find the editor element
    const editorContainer = canvas.getByRole('textbox');

    // Wait a bit for the editor to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get the editor content
    const editorContent = editorContainer.textContent || '';

    // Confirm initial content: should have anchor + text + anchor pattern
    // The content should be something like "Cloudflare Junie Cursor"
    await expect(editorContent).toContain('Cloudflare');
    await expect(editorContent).toContain('Junie');
    await expect(editorContent).toContain('Cursor');

    // Check that we have anchor elements (dx-anchor tags in DOM)
    const anchors = canvasElement.querySelectorAll('dx-anchor');
    await expect(anchors.length).toBe(2);
    await expect(anchors[0].textContent).toBe('Cloudflare');
    await expect(anchors[1].textContent).toBe('Cursor');

    // Click on the editor to focus it
    await userEvent.click(editorContainer);

    // Move cursor to the end
    await userEvent.keyboard('{End}');

    // Press backspace to remove the last anchor
    await userEvent.keyboard('{Backspace}');

    // Wait for the change to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Confirm the last anchor was removed - should now only have 1 anchor
    const anchorsAfter = canvasElement.querySelectorAll('dx-anchor');
    await expect(anchorsAfter.length).toBe(1);
    await expect(anchorsAfter[0].textContent).toBe('Cloudflare');

    // Type Space to add some separation
    await userEvent.keyboard(' ');

    // Type #curs to trigger search for "Cursor"
    await userEvent.keyboard('#curs');

    // Wait for the autocomplete menu to appear
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Press Enter to select the "Cursor" option
    await userEvent.keyboard('{Enter}');

    // Wait for the change to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Confirm that a new anchor was added with text content "Cursor"
    const anchorsAfterAdd = canvasElement.querySelectorAll('dx-anchor');
    await expect(anchorsAfterAdd.length).toBe(2);
    await expect(anchorsAfterAdd[anchorsAfterAdd.length - 1].textContent).toBe('Cursor');
  },
};
