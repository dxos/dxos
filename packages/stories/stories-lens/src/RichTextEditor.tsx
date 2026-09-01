//
// Copyright 2026 DXOS.org
//

import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { type Node as PmNode, Schema as PmSchema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { useCallback, useEffect, useRef } from 'react';

import { Lens } from '@dxos/echo-panproto';
import { useLens } from '@dxos/echo-panproto/react';
import { useObject } from '@dxos/echo-react';
import { Card } from '@dxos/react-ui';
import { Text } from '@dxos/schema';

import { type Block, type Inline, type Mark, RICH_TEXT_LENS_ID, RichTextLens, blockText } from './rich-text';

//
// A basic ProseMirror editor driven entirely by the lens. It never sees markdown: it reads a block
// tree and writes a block tree, and the lens turns each changed block into a splice over that block's
// own source range.
//

/**
 * Weight and slant must be carried by the theme's OWN classes, on the element.
 *
 * The theme sets `font-synthesis: none` and pins `font-variation-settings: 'wght' 400` at `:root`, so
 * a bare `font-weight: 700` computes correctly and renders as regular text — nothing drives the
 * variable font's axis. Only the literal `.font-bold` / `.italic` classes set those axes, which a
 * descendant variant like `[&_strong]:font-bold` never applies.
 */
const HEADING_CLASSES: Record<number, string> = {
  1: 'text-xl font-semibold',
  2: 'text-lg font-semibold',
  3: 'text-base font-semibold',
  4: 'text-sm font-semibold',
};

/** Minimal schema: the block kinds the lens projects, and the inline marks it carries. */
const schema = new PmSchema({
  marks: {
    strong: { parseDOM: [{ tag: 'strong' }], toDOM: () => ['strong', { class: 'font-bold' }, 0] },
    em: { parseDOM: [{ tag: 'em' }], toDOM: () => ['em', { class: 'italic' }, 0] },
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
      toDOM: (node) => [`h${node.attrs.level}`, { class: HEADING_CLASSES[node.attrs.level] ?? HEADING_CLASSES[4] }, 0],
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
 * Layout only — everything font-related is a class on the node itself (see {@link HEADING_CLASSES}).
 * The preflight resets list markers, so the bullets still need styling here.
 */
const CONTENT_CLASSES = [
  'outline-none p-2 text-sm flex flex-col gap-2',
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

export const RichTextEditor = ({ text }: { text: Text.Text }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | undefined>(undefined);
  const [view] = useLens(text, RichTextLens);
  const blocks = view?.blocks ?? [];

  // The blur handler and the reconcile effect both need the latest projection without re-mounting.
  const blocksRef = useRef<readonly Block[]>(blocks);
  // Assigned in an effect, not during render: an abandoned concurrent render must not leave a
  // projection behind for the blur handler to apply.
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

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
        Lens.put(text, RichTextLens, { blocks: fromDoc(editor.state.doc) });
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

  return <div ref={parentRef} className='overflow-auto' data-testid='rich-text-editor' />;
};

/**
 * What is actually stored, beside the blocks the lens projects from it.
 *
 * The raw string matters to the demo now that both editors render marks rather than syntax: it is the
 * only pane that shows the markdown a splice actually rewrote.
 */
export const BlockList = ({ text }: { text: Text.Text }) => {
  const [view] = useLens(text, RichTextLens);
  const [snapshot] = useObject(text);

  return (
    <Card.Root fullWidth border={false}>
      <Card.Section title='stored markdown'>
        <Card.Row fullWidth>
          <Card.Text classNames='whitespace-pre-wrap font-mono text-xs' data-testid='raw-content'>
            {snapshot?.content ?? ''}
          </Card.Text>
        </Card.Row>
      </Card.Section>
      <Card.Section title='blocks'>
        <Card.Row fullWidth>
          <Card.Text classNames='whitespace-pre-wrap font-mono text-xs' data-testid='block-list'>
            {(view?.blocks ?? [])
              .map(
                (block) =>
                  `${block.type}${block.level ? block.level : ''} [${block.range[0]},${block.range[1]}) ${blockText(block)}`,
              )
              .join('\n')}
          </Card.Text>
        </Card.Row>
      </Card.Section>
    </Card.Root>
  );
};

export { RICH_TEXT_LENS_ID };
