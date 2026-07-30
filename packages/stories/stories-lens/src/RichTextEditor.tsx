//
// Copyright 2026 DXOS.org
//

import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { type Node as PmNode, Schema as PmSchema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { useEffect, useRef } from 'react';

import { type Obj } from '@dxos/echo';
import { Lens } from '@dxos/echo-panproto';
import { useLens } from '@dxos/echo-panproto/react';

import {
  type Block,
  type Inline,
  type Mark,
  RICH_TEXT_LENS_ID,
  type RichText,
  RichTextLens,
  blockText,
} from './rich-text';

//
// A basic ProseMirror editor driven entirely by the lens. It never sees markdown: it reads a block
// tree and writes a block tree, and the lens turns each changed block into a splice over that block's
// own source range.
//

/** Minimal schema: the block kinds the lens projects, and the inline marks it carries. */
const schema = new PmSchema({
  marks: {
    strong: { parseDOM: [{ tag: 'strong' }], toDOM: () => ['strong', 0] },
    em: { parseDOM: [{ tag: 'em' }], toDOM: () => ['em', 0] },
    code: { parseDOM: [{ tag: 'code' }], toDOM: () => ['code', { class: 'px-1 rounded bg-hover-surface' }, 0] },
  },
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block', parseDOM: [{ tag: 'p' }], toDOM: () => ['p', 0] },
    heading: {
      attrs: { level: { default: 1 } },
      content: 'text*',
      group: 'block',
      defining: true,
      parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}`, attrs: { level } })),
      toDOM: (node) => [`h${node.attrs.level}`, 0],
    },
    bullet: {
      content: 'text*',
      group: 'block',
      parseDOM: [{ tag: 'li' }],
      toDOM: () => ['li', { class: 'list-item' }, 0],
    },
    text: { group: 'inline' },
  },
});

/** Marked runs become text nodes carrying ProseMirror marks — this is what renders as rich text. */
const toInline = (runs: readonly Inline[]) =>
  runs
    .filter((run) => run.text.length > 0)
    .map((run) =>
      schema.text(
        run.text,
        (run.marks ?? []).map((mark) => schema.marks[mark].create()),
      ),
    );

const EMPTY_BLOCK: Block = { type: 'paragraph', content: [], range: [0, 0] };

const toDoc = (blocks: readonly Block[]) =>
  schema.node(
    'doc',
    null,
    (blocks.length > 0 ? blocks : [EMPTY_BLOCK]).map((block) =>
      block.type === 'heading'
        ? schema.node('heading', { level: block.level ?? 1 }, toInline(block.content))
        : schema.node(block.type, null, toInline(block.content)),
    ),
  );

/** Read the editor's document back as blocks. Ranges are the lens's concern, not the editor's. */
const fromDoc = (doc: PmNode): Block[] => {
  const blocks: Block[] = [];
  doc.forEach((node: PmNode) => {
    const type = node.type.name === 'heading' ? 'heading' : node.type.name === 'bullet' ? 'bullet' : 'paragraph';
    const content: Inline[] = [];
    node.forEach((child: PmNode) => {
      if (!child.isText) {
        return;
      }
      const marks = child.marks.map((mark) => mark.type.name as Mark);
      content.push(marks.length > 0 ? { text: child.text ?? '', marks } : { text: child.text ?? '' });
    });
    blocks.push({
      type,
      level: type === 'heading' ? node.attrs.level : undefined,
      content,
      range: [0, 0],
    });
  });
  return blocks;
};

/** Mod-b / Mod-i / Mod-e toggle marks, so the editor writes rich text rather than only showing it. */
const plugins = [
  keymap({
    'Mod-b': toggleMark(schema.marks.strong),
    'Mod-i': toggleMark(schema.marks.em),
    'Mod-e': toggleMark(schema.marks.code),
  }),
  keymap(baseKeymap),
];

const sameContent = (a: readonly Inline[], b: readonly Inline[]): boolean =>
  a.length === b.length &&
  a.every((run, index) => run.text === b[index].text && (run.marks ?? []).join() === (b[index].marks ?? []).join());

const sameBlocks = (a: readonly Block[], b: readonly Block[]): boolean =>
  a.length === b.length &&
  a.every(
    (block, index) =>
      block.type === b[index].type &&
      (block.level ?? 0) === (b[index].level ?? 0) &&
      sameContent(block.content, b[index].content),
  );

export const RichTextEditor = ({ text }: { text: Obj.Unknown }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | undefined>(undefined);
  const [view] = useLens(text, RichTextLens as Lens.Lens<any, RichText>);
  const blocks = view?.blocks ?? [];

  // Mount once; the effect below reconciles incoming changes.
  useEffect(() => {
    if (!parentRef.current) {
      return;
    }

    const editor = new EditorView(parentRef.current, {
      state: EditorState.create({ doc: toDoc(blocks), plugins }),
      dispatchTransaction: (transaction) => {
        const next = editor.state.apply(transaction);
        editor.updateState(next);
        if (!transaction.docChanged) {
          return;
        }
        // Write the block tree back through the lens. `put` diffs it against the tree the lens
        // currently projects and emits one splice per changed block.
        Lens.put(text, RichTextLens as Lens.Lens<any, RichText>, { blocks: fromDoc(next.doc) });
      },
      attributes: { 'class': 'prose-editor outline-none p-2 text-sm flex flex-col gap-2', 'data-testid': 'pm-editor' },
    });

    viewRef.current = editor;
    return () => {
      editor.destroy();
      viewRef.current = undefined;
    };
    // Mount-only: the editor owns its own state from here, and remounting would drop the selection.
  }, [text]);

  // Reconcile a change that came from elsewhere — the markdown editor, or another peer.
  useEffect(() => {
    const editor = viewRef.current;
    if (!editor || editor.hasFocus()) {
      return;
    }
    if (sameBlocks(fromDoc(editor.state.doc), blocks)) {
      return;
    }
    editor.updateState(EditorState.create({ doc: toDoc(blocks), plugins }));
  }, [blocks]);

  return <div ref={parentRef} className='min-h-0 overflow-auto' data-testid='rich-text-editor' />;
};

/** The block tree as the lens reports it, ranges included — the anchors that make splices minimal. */
export const BlockList = ({ text }: { text: Obj.Unknown }) => {
  const [view] = useLens(text, RichTextLens as Lens.Lens<any, RichText>);

  return (
    <pre className='text-xs whitespace-pre-wrap' data-testid='block-list'>
      {(view?.blocks ?? [])
        .map(
          (block) =>
            `${block.type}${block.level ? block.level : ''} [${block.range[0]},${block.range[1]}) ${blockText(block)}`,
        )
        .join('\n')}
    </pre>
  );
};

export { RICH_TEXT_LENS_ID };
