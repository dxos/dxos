//
// Copyright 2026 DXOS.org
//

import { parser } from '@lezer/markdown';
import * as Schema from 'effect/Schema';

import { Lens } from '@dxos/echo-panproto';
import { Text } from '@dxos/schema';

//
// The rich-text lens: a `Text` object — whose `content` is a markdown string — viewed as a tree of
// blocks. A *coded* lens rather than a mapping, because no per-property correspondence can express
// parsing.
//
// The lens sits on `Text`, not on a document type: `Document.content` is a `Ref<Text>`, so lensing
// `Text` makes this reusable for every text-bearing type.
//
// The mechanism that makes it collaborative: every block carries the exact character range it came
// from, so an edit to one block becomes a `splice` over that range alone. Text outside the range is
// untouched, which is what lets a peer typing in the markdown editor merge with a peer editing a
// different block in the rich-text editor. Re-serializing the whole document would destroy both their
// cursors and each other's edits.
//

export type BlockType = 'heading' | 'paragraph' | 'bullet';

export const Block = Schema.Struct({
  type: Schema.Literal('heading', 'paragraph', 'bullet'),
  /** Heading depth, 1-6; absent for other blocks. */
  level: Schema.optional(Schema.Number),
  /** The block's text with its markdown syntax stripped. */
  text: Schema.String,
  /** `[start, end)` in the source string — the anchor a write splices over. */
  range: Schema.Tuple(Schema.Number, Schema.Number),
});

export type Block = Schema.Schema.Type<typeof Block>;

/**
 * The lensed shape. A plain schema, not an ECHO type: no object of this shape is ever stored, so it
 * forfeits typename dispatch (see the package API doc) and exists purely as the contract the
 * rich-text editor is written against.
 */
export const RichText = Schema.Struct({
  blocks: Schema.Array(Block),
});

export type RichText = Schema.Schema.Type<typeof RichText>;

export const RICH_TEXT_LENS_ID = 'org.dxos.demo.lens.text-as-rich-text';

//
// Parsing. `@lezer/markdown` is already a dependency of `@dxos/react-ui-markdown` and every node
// carries `from`/`to` source offsets, which is exactly the anchor this lens needs — a parser without
// offsets would force whole-document rewrites on every edit.
//

const BLOCK_NODES: Record<string, BlockType> = {
  ATXHeading1: 'heading',
  ATXHeading2: 'heading',
  ATXHeading3: 'heading',
  ATXHeading4: 'heading',
  ATXHeading5: 'heading',
  ATXHeading6: 'heading',
  SetextHeading1: 'heading',
  SetextHeading2: 'heading',
  Paragraph: 'paragraph',
  ListItem: 'bullet',
};

const HEADING_LEVEL = /^(#{1,6})\s+/;

/** Strip the syntax that produced a block, leaving the text a rich-text editor should show. */
const stripMarkup = (type: BlockType, source: string): { text: string; level?: number } => {
  if (type === 'heading') {
    const match = source.match(HEADING_LEVEL);
    if (match) {
      return { text: source.slice(match[0].length).trim(), level: match[1].length };
    }
    // Setext: the underline is on the following line.
    const [first = '', underline = ''] = source.split('\n');
    return { text: first.trim(), level: underline.trimStart().startsWith('=') ? 1 : 2 };
  }
  if (type === 'bullet') {
    return { text: source.replace(/^\s*([-*+]|\d+\.)\s+/, '').trim() };
  }
  return { text: source.trim() };
};

/** Parse markdown into blocks, each carrying the source range it came from. */
export const parseBlocks = (content: string): Block[] => {
  const blocks: Block[] = [];
  const tree = parser.parse(content);
  const cursor = tree.cursor();

  do {
    const type = BLOCK_NODES[cursor.name];
    if (!type) {
      continue;
    }
    // A list item contains its own paragraph; keep the item and skip the nested duplicate.
    if (type === 'paragraph' && blocks.length > 0) {
      const previous = blocks[blocks.length - 1];
      if (previous.type === 'bullet' && cursor.from >= previous.range[0] && cursor.to <= previous.range[1]) {
        continue;
      }
    }
    const source = content.slice(cursor.from, cursor.to);
    const { text, level } = stripMarkup(type, source);
    blocks.push({ type, level, text, range: [cursor.from, cursor.to] });
  } while (cursor.next());

  return blocks.sort((a, b) => a.range[0] - b.range[0]);
};

/** Render one block back to the markdown that produced it. */
export const renderBlock = (block: Block): string => {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level ?? 1)} ${block.text}`;
    case 'bullet':
      return `- ${block.text}`;
    case 'paragraph':
      return block.text;
  }
};

/**
 * The writes that turn `previous` into `next`.
 *
 * Blocks are matched by position, so an edit to one block splices only its own range. Insertions and
 * deletions are handled at the tail, which is where a basic editor puts them; a reorder falls back to
 * rewriting the affected span. Nothing here ever rewrites the whole document.
 */
export const diffBlocks = (previous: readonly Block[], next: readonly Block[]): Lens.Write[] => {
  const writes: Lens.Write[] = [];
  const shared = Math.min(previous.length, next.length);

  // Later ranges shift when an earlier block changes length, so walk backwards: every splice below is
  // expressed in the ORIGINAL coordinates the blocks were parsed with.
  for (let index = shared - 1; index >= 0; index--) {
    const before = previous[index];
    const after = next[index];
    const rendered = renderBlock(after);
    if (rendered === renderBlock(before)) {
      continue;
    }
    writes.push({
      kind: 'splice',
      path: ['content'],
      start: before.range[0],
      deleteCount: before.range[1] - before.range[0],
      insert: rendered,
    });
  }

  if (next.length > previous.length) {
    // Appended blocks: one insert at the end of the last shared block.
    const at = previous.length > 0 ? previous[previous.length - 1].range[1] : 0;
    const added = next
      .slice(previous.length)
      .map((block) => renderBlock(block))
      .join('\n\n');
    writes.push({ kind: 'splice', path: ['content'], start: at, deleteCount: 0, insert: `\n\n${added}` });
  } else if (next.length < previous.length) {
    // Removed blocks: delete from the first dropped block to the end of the last.
    const from = previous[next.length].range[0];
    const to = previous[previous.length - 1].range[1];
    writes.push({ kind: 'splice', path: ['content'], start: from, deleteCount: to - from, insert: '' });
  }

  return writes;
};

/** `Text` → `RichText`. */
export const RichTextLens: Lens.Lens<Text.Text, RichText> = Lens.register(
  Lens.coded(RICH_TEXT_LENS_ID, Text.Text, RichText, {
    get: (text) => ({ blocks: parseBlocks(text.content ?? '') }),
    put: (next, previous) => diffBlocks(previous.blocks, next.blocks ?? previous.blocks),
  }),
);

export const DEMO_MARKDOWN = [
  '# One object, two editors',
  '',
  'The markdown on the left is what is stored. The blocks on the right are a view of it.',
  '',
  '## Why it merges',
  '',
  '- Each block remembers its source range',
  '- So an edit splices that range alone',
].join('\n');

export const makeDemoText = () => Text.make({ content: DEMO_MARKDOWN });
