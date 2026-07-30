//
// Copyright 2026 DXOS.org
//

import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { type Node as PmNode, Schema as PmSchema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { useCallback, useEffect, useRef } from 'react';

import { type Obj } from '@dxos/echo';
import { Lens } from '@dxos/echo-panproto';
import { useLens } from '@dxos/echo-panproto/react';
import { useObject } from '@dxos/echo-react';

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
    bullet_list: {
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul' }],
      toDOM: () => ['ul', 0],
    },
    list_item: {
      content: 'text*',
      parseDOM: [{ tag: 'li' }],
      toDOM: () => ['li', 0],
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

/**
 * The editor styles its own content: the theme's preflight resets heading sizes, `strong` weight, and
 * list markers, so without this the block structure and marks render as undifferentiated text.
 */
const CONTENT_CLASSES = [
  'outline-none p-2 text-sm flex flex-col gap-2',
  '[&_h1]:text-xl [&_h1]:font-semibold',
  '[&_h2]:text-lg [&_h2]:font-semibold',
  '[&_h3]:text-base [&_h3]:font-semibold',
  '[&_h4]:text-sm [&_h4]:font-semibold',
  '[&_strong]:font-bold',
  '[&_em]:italic',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1',
  '[&_li]:list-item',
].join(' ');

/** Consecutive bullets become one `bullet_list`, so the markers actually render. */
const toDoc = (blocks: readonly Block[]) => {
  const nodes: PmNode[] = [];
  let items: PmNode[] = [];

  const flush = () => {
    if (items.length > 0) {
      nodes.push(schema.node('bullet_list', null, items));
      items = [];
    }
  };

  for (const block of blocks.length > 0 ? blocks : [EMPTY_BLOCK]) {
    if (block.type === 'bullet') {
      items.push(schema.node('list_item', null, toInline(block.content)));
      continue;
    }
    flush();
    nodes.push(
      block.type === 'heading'
        ? schema.node('heading', { level: block.level ?? 1 }, toInline(block.content))
        : schema.node('paragraph', null, toInline(block.content)),
    );
  }
  flush();

  return schema.node('doc', null, nodes);
};

/** The marked runs of one block-level node. */
const inlineOf = (node: PmNode): Inline[] => {
  const content: Inline[] = [];
  node.forEach((child: PmNode) => {
    if (!child.isText) {
      return;
    }
    const marks = child.marks.map((mark) => mark.type.name as Mark);
    content.push(marks.length > 0 ? { text: child.text ?? '', marks } : { text: child.text ?? '' });
  });
  return content;
};

/**
 * Read the editor's document back as a flat block list — lists are ungrouped again, since the lens
 * addresses one markdown line per block. Ranges are the lens's concern, not the editor's.
 */
const fromDoc = (doc: PmNode): Block[] => {
  const blocks: Block[] = [];
  doc.forEach((node: PmNode) => {
    if (node.type.name === 'bullet_list') {
      node.forEach((item: PmNode) => {
        blocks.push({ type: 'bullet', content: inlineOf(item), range: [0, 0] });
      });
      return;
    }
    const heading = node.type.name === 'heading';
    blocks.push({
      type: heading ? 'heading' : 'paragraph',
      level: heading ? node.attrs.level : undefined,
      content: inlineOf(node),
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

/** A stable signature of the lensed content, so the reconcile effect keys off VALUE, not identity. */
const signatureOf = (blocks: readonly Block[]): string =>
  JSON.stringify(blocks.map((block) => [block.type, block.level ?? 0, block.content]));

/** Marks a transaction as coming from the lens, so writing it back is skipped. */
const REMOTE = 'lens-remote';

export const RichTextEditor = ({ text }: { text: Obj.Unknown }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | undefined>(undefined);
  const [view] = useLens(text, RichTextLens as Lens.Lens<any, RichText>);
  const blocks = view?.blocks ?? [];

  // The blur handler and the reconcile effect both need the latest projection without re-mounting.
  const blocksRef = useRef<readonly Block[]>(blocks);
  blocksRef.current = blocks;

  /**
   * Replace the document with what the lens projects, as a transaction rather than a fresh state: it
   * preserves plugin state, and the `REMOTE` marker stops `dispatchTransaction` writing it straight back
   * through the lens — which would echo every incoming change into an outgoing one.
   */
  const reconcile = useCallback(() => {
    const editor = viewRef.current;
    if (!editor) {
      return;
    }
    const next = toDoc(blocksRef.current);
    if (next.eq(editor.state.doc)) {
      return;
    }
    const transaction = editor.state.tr.replaceWith(0, editor.state.doc.content.size, next.content);
    transaction.setMeta(REMOTE, true);
    editor.dispatch(transaction);
  }, []);

  useEffect(() => {
    if (!parentRef.current) {
      return;
    }

    const editor = new EditorView(parentRef.current, {
      state: EditorState.create({ doc: toDoc(blocksRef.current), plugins }),
      dispatchTransaction: (transaction) => {
        editor.updateState(editor.state.apply(transaction));
        if (!transaction.docChanged || transaction.getMeta(REMOTE)) {
          return;
        }
        // Write the block tree back through the lens. `put` diffs it against the tree the lens
        // currently projects and emits one splice per changed block.
        Lens.put(text, RichTextLens as Lens.Lens<any, RichText>, { blocks: fromDoc(editor.state.doc) });
      },
      handleDOMEvents: {
        // A change that arrived while this editor had focus was deliberately skipped; apply it now the
        // caret is elsewhere, so the two sides cannot drift apart.
        blur: () => {
          reconcile();
          return false;
        },
      },
      attributes: { 'class': CONTENT_CLASSES, 'data-testid': 'pm-editor' },
    });

    viewRef.current = editor;
    return () => {
      editor.destroy();
      viewRef.current = undefined;
    };
    // Mount-only: the editor owns its own state from here, and remounting would drop the selection.
  }, [text, reconcile]);

  // Reconcile a change that came from elsewhere — the markdown editor, or another peer. Skipped while
  // this editor has focus so a remote change never fights the local caret; blur catches up.
  const signature = signatureOf(blocks);
  useEffect(() => {
    if (!viewRef.current?.hasFocus()) {
      reconcile();
    }
  }, [signature, reconcile]);

  return <div ref={parentRef} className='min-h-0 overflow-auto' data-testid='rich-text-editor' />;
};

/**
 * What is actually stored, beside the blocks the lens projects from it.
 *
 * The raw string matters to the demo now that both editors render marks rather than syntax: it is the
 * only pane that shows the markdown a splice actually rewrote.
 */
export const BlockList = ({ text }: { text: Obj.Unknown }) => {
  const [view] = useLens(text, RichTextLens as Lens.Lens<any, RichText>);
  const [snapshot] = useObject(text);

  return (
    <>
      <div className='text-xs uppercase tracking-wide text-subdued'>stored markdown</div>
      <pre className='text-xs whitespace-pre-wrap' data-testid='raw-content'>
        {(snapshot as { content?: string } | undefined)?.content ?? ''}
      </pre>
      <div className='text-xs uppercase tracking-wide text-subdued'>blocks</div>
      <pre className='text-xs whitespace-pre-wrap' data-testid='block-list'>
        {(view?.blocks ?? [])
          .map(
            (block) =>
              `${block.type}${block.level ? block.level : ''} [${block.range[0]},${block.range[1]}) ${blockText(block)}`,
          )
          .join('\n')}
      </pre>
    </>
  );
};

export { RICH_TEXT_LENS_ID };
