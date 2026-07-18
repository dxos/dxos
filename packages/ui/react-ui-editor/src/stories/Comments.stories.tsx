//
// Copyright 2023 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo, useRef, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { random } from '@dxos/random';
import { IconButton, useThemeContext } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Listbox } from '@dxos/react-ui-list';
import { createMenuAction } from '@dxos/react-ui-menu';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  Cursor,
  EditorView,
  comments,
  createBasicExtensions,
  createComment,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  formattingKeymap,
  scrollThreadIntoView,
} from '@dxos/ui-editor';
import { type Comment } from '@dxos/ui-editor/types';

import { translations } from '#translations';

import { Editor, type EditorController } from '../components';

random.seed(123);

const DOCUMENT_ID = 'test';

type StoryArgs = {
  content?: string;
  comments?: Comment[];
};

const DefaultStory = ({ content, comments: commentsProp = [] }: StoryArgs) => {
  const { themeMode } = useThemeContext();
  const registry = useContext(RegistryContext);
  const editorRef = useRef<EditorController>(null);
  const attentionAttrs = useAttentionAttributes(DOCUMENT_ID);
  const commentsAtom = useMemo(() => Atom.make<Comment[]>(commentsProp), []);
  const [activeComment, setActiveComment] = useState<string>();
  // Bumped on every document edit so the comments list re-resolves each thread's range.
  const [, setDocVersion] = useState(0);

  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: 'Type here...', lineWrapping: true, search: true }),
      createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: documentSlots }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      formattingKeymap(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          setDocVersion((version) => version + 1);
        }
      }),
      comments({
        id: DOCUMENT_ID,
        // Append the new thread to the atom; the extension re-reads it via `getComments`/`subscribe`.
        onCreate: ({ cursor }) => {
          registry.set(commentsAtom, [...registry.get(commentsAtom), { id: PublicKey.random().toHex(), cursor }]);
        },
        onSelect: ({ comments, selection }) => {
          // Reflect the editor's current thread in the list selection.
          setActiveComment(selection.current);
          log.info('update', {
            comments: comments.length,
            active: selection.current?.slice(0, 8),
            closest: selection.closest?.slice(0, 8),
          });
        },
        getComments: () => registry.get(commentsAtom),
        subscribe: (sink) => {
          sink();
          return registry.subscribe(commentsAtom, () => sink());
        },
      }),
    ],
    [themeMode, registry, commentsAtom],
  );

  // Toolbar action that creates a comment on the current selection (mirrors the `meta-'` shortcut).
  const customActions = useMemo(
    () =>
      Atom.make(() => {
        const action = createMenuAction(
          'comment',
          () => {
            const view = editorRef.current?.view;
            if (view) {
              createComment(view);
            }
          },
          {
            label: 'Add comment',
            icon: 'ph--chat-text--regular',
            iconOnly: true,
          },
        );

        return {
          nodes: [action],
          edges: [{ source: 'root', target: action.id, relation: 'child' as const }],
        };
      }),
    [],
  );

  return (
    <Editor.Root ref={editorRef} extensions={extensions}>
      <Editor.Content>
        <Editor.Toolbar classNames='dx-document' attendableId={DOCUMENT_ID} customActions={customActions} />
        <div className='dx-container dx-document bg-base-surface' {...attentionAttrs}>
          <Editor.View initialValue={content} selectionEnd />
        </div>
        <CommentsList
          commentsAtom={commentsAtom}
          getView={() => editorRef.current?.view}
          activeId={activeComment}
          onActivate={setActiveComment}
        />
      </Editor.Content>
    </Editor.Root>
  );
};

/**
 * Renders the current comments (reactively from the atom), labelling each with the text it anchors to
 * (resolved from its relative cursor against the live editor state). Selecting a row scrolls to and
 * activates that thread in the editor; the delete button removes it.
 */
const CommentsList = ({
  commentsAtom,
  getView,
  activeId,
  onActivate,
}: {
  commentsAtom: Atom.Writable<Comment[]>;
  getView: () => EditorController['view'] | undefined;
  activeId?: string;
  onActivate: (id: string) => void;
}) => {
  const registry = useContext(RegistryContext);
  const items = useAtomValue(commentsAtom);

  const view = getView();
  // Resolve each comment's range once, then sort by document position (unresolved ranges sort last).
  const resolved = items
    .map((comment) => ({
      comment,
      range: view && comment.cursor ? Cursor.getRangeFromCursor(view.state, comment.cursor) : undefined,
    }))
    .sort((a, b) => (a.range?.from ?? Infinity) - (b.range?.from ?? Infinity));

  const handleSelect = (id: string) => {
    // Update the list selection directly: activating a thread in the editor doesn't re-fire `onSelect`
    // (the effect already set it current), so the round-trip wouldn't move the list selection.
    onActivate(id);
    if (view) {
      scrollThreadIntoView(view, id);
      view.focus();
    }
  };

  const handleDelete = (id: string) => {
    registry.set(
      commentsAtom,
      registry.get(commentsAtom).filter((comment) => comment.id !== id),
    );
  };

  return (
    <div className='border-bs border-subdued-separator overflow-y-auto max-bs-48'>
      <Listbox.Root value={activeId} onValueChange={handleSelect}>
        <Listbox.Content aria-label='Comments' classNames='p-1'>
          {resolved.map(({ comment, range }) => (
            <Listbox.Item key={comment.id} id={comment.id} classNames='flex items-center gap-2'>
              <Listbox.ItemContent
                classNames='grow'
                title={(range && view?.state.doc.sliceString(range.from, range.to)) || comment.cursor || comment.id}
                description={range ? `${range.from}–${range.to}` : comment.cursor}
              />
              <IconButton
                variant='ghost'
                iconOnly
                icon='ph--x--regular'
                label='Delete comment'
                onClick={(event) => {
                  // Keep the row from selecting when the delete button is pressed.
                  event.stopPropagation();
                  handleDelete(comment.id);
                }}
              />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Comments',
  render: (args) => <DefaultStory {...args} />,
  decorators: [withAttention(DOCUMENT_ID), withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {
    content: Array.from({ length: 3 })
      .map(() => random.lorem.paragraph(3))
      .join('\n\n'),
    comments: [
      { id: PublicKey.random().toHex(), cursor: '16:197' },
      { id: PublicKey.random().toHex(), cursor: '402:420' },
    ],
  },
};
