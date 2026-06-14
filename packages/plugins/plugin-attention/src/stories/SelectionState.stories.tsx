//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  type ViewStateManager,
  defineViewState,
  useSelection,
  useSelectionActions,
  useViewStateManager,
} from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { useTextEditor } from '@dxos/react-ui-editor';
import { OrderedList } from '@dxos/react-ui-list';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  EditorSelectionStateSchema,
  type EditorStateStore,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  documentId,
  selectionState,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

//
// Editor ViewState aspect — local (localStorage) backed, per document id.
// Mirrors plugin-markdown's editor-view-state.ts but defined inline so
// plugin-attention does not depend on plugin-markdown.
//

const editorViewStateAspect = defineViewState({
  key: 'story-editor',
  backend: 'local',
  schema: EditorSelectionStateSchema,
  defaultValue: () => ({}),
});

const makeEditorStore = (manager: ViewStateManager): EditorStateStore => ({
  getState: (id) => manager.get(editorViewStateAspect, id),
  setState: (id, state) => manager.set(editorViewStateAspect, id, state),
});

//
// Sample data.
//

type StoryItem = { id: string; label: string; content: string };

const LIST_CONTEXT = 'story-list';

const ITEMS: StoryItem[] = [
  {
    id: 'item-alpha',
    label: 'Alpha',
    content: [
      '# Alpha',
      '',
      'This is the **Alpha** document. Scroll down and move the caret, then switch to another item and come back — your position is restored.',
      '',
      Array.from({ length: 30 }, (_, i) => `Line ${i + 1} of Alpha content.`).join('\n'),
    ].join('\n'),
  },
  {
    id: 'item-bravo',
    label: 'Bravo',
    content: [
      '# Bravo',
      '',
      'This is the **Bravo** document. Each document remembers its own scroll and caret position independently.',
      '',
      Array.from({ length: 30 }, (_, i) => `Line ${i + 1} of Bravo content.`).join('\n'),
    ].join('\n'),
  },
  {
    id: 'item-charlie',
    label: 'Charlie',
    content: [
      '# Charlie',
      '',
      'This is the **Charlie** document. The selection state is memory-backed (ephemeral); the editor state is local-backed (localStorage).',
      '',
      Array.from({ length: 30 }, (_, i) => `Line ${i + 1} of Charlie content.`).join('\n'),
    ].join('\n'),
  },
];

const isItem = (value: unknown): value is StoryItem =>
  typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';

//
// ItemEditor — mounts a CodeMirror editor for the selected item, wired to the
// local-backed ViewState store so caret/scroll is remembered per document id.
//

type ItemEditorProps = { item: StoryItem; editorStore: EditorStateStore };

const ItemEditor = ({ item, editorStore }: ItemEditorProps) => {
  const { themeMode } = useThemeContext();

  const { parentRef } = useTextEditor(
    () => ({
      id: item.id,
      initialValue: item.content,
      extensions: [
        createBasicExtensions({ placeholder: 'Start typing…', scrollPastEnd: true }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        createMarkdownExtensions(),
        documentId.of(item.id),
        selectionState(editorStore),
      ],
    }),
    [item.id, themeMode, editorStore],
  );

  return <div ref={parentRef} className='flex-1 overflow-hidden' />;
};

//
// SelectionStateStory — the canonical demo component.
//

const SelectionStateStory = () => {
  const manager = useViewStateManager();
  const editorStore = useMemo(() => makeEditorStore(manager), [manager]);

  const selectedId = useSelection(LIST_CONTEXT, 'single');
  const { single } = useSelectionActions(LIST_CONTEXT);

  const selectedItem = ITEMS.find((item) => item.id === selectedId);

  return (
    <div className='flex h-full overflow-hidden divide-x divide-separator'>
      {/* Left pane: ordered list with selection */}
      <div className='w-56 shrink-0 flex flex-col overflow-hidden'>
        <div className='px-3 py-2 text-sm font-medium text-subdued border-b border-separator'>Items</div>
        <OrderedList.Root<StoryItem> items={ITEMS} isItem={isItem} getId={(item) => item.id}>
          {({ items: resolved }) => (
            <OrderedList.Content>
              {resolved.map((item) => (
                <OrderedList.Item
                  key={item.id}
                  id={item.id}
                  item={item}
                  hover
                  classNames={mx('px-3 py-2 cursor-pointer', item.id === selectedId && 'bg-hoverSurface font-medium')}
                  onClick={() => single(item.id)}
                >
                  {item.label}
                </OrderedList.Item>
              ))}
            </OrderedList.Content>
          )}
        </OrderedList.Root>
      </div>

      {/* Right pane: editor for selected item */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {selectedItem ? (
          <ItemEditor key={selectedItem.id} item={selectedItem} editorStore={editorStore} />
        ) : (
          <div className='flex items-center justify-center h-full text-subdued text-sm'>Select an item to edit.</div>
        )}
      </div>
    </div>
  );
};

//
// Storybook meta.
//

const meta: Meta<typeof SelectionStateStory> = {
  title: 'plugins/plugin-attention/SelectionState',
  component: SelectionStateStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withAttention()],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <SelectionStateStory /> };
