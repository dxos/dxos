//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Lens } from '@dxos/echo-panproto';
import { Text } from '@dxos/schema';

import { DEMO_MARKDOWN, RichTextLens, blockText, diffBlocks, parseBlocks, plain } from './rich-text.ts';

//
// The lens's own logic, without a browser. The property that matters is that editing one block
// produces a splice over that block's range alone — everything else in the document is untouched, which
// is what lets the markdown editor and another peer keep their concurrent edits.
//

/** Apply the writes to a plain string, as `Text.splice` would to the CRDT. */
const applyToString = (content: string, writes: readonly Lens.Write[]): string => {
  let result = content;
  for (const write of writes) {
    if (write.kind !== 'splice') {
      continue;
    }
    result = result.slice(0, write.start) + write.insert + result.slice(write.start + write.deleteCount);
  }
  return result;
};

describe('parseBlocks', () => {
  test('parses blocks with their source ranges', ({ expect }) => {
    const blocks = parseBlocks(DEMO_MARKDOWN);

    expect(blocks.map((block) => `${block.type}${block.level ?? ''}`)).to.deep.eq([
      'heading1',
      'paragraph',
      'heading2',
      'bullet',
      'bullet',
    ]);
    expect(blockText(blocks[0])).to.eq('One object, two editors');
    expect(blockText(blocks[2])).to.eq('Why it merges');
    expect(blockText(blocks[3])).to.eq('Each block remembers its source range');

    // Every range must quote the source it came from — that is the whole basis of the splice.
    for (const block of blocks) {
      expect(DEMO_MARKDOWN.slice(block.range[0], block.range[1]).length).to.be.greaterThan(0);
      expect(block.range[1]).to.be.greaterThan(block.range[0]);
    }
    expect(DEMO_MARKDOWN.slice(blocks[0].range[0], blocks[0].range[1])).to.eq('# One object, two editors');
  });

  test('markdown syntax belongs to the source, not to the view', ({ expect }) => {
    for (const block of parseBlocks(DEMO_MARKDOWN)) {
      const text = blockText(block);
      expect(text.startsWith('#')).to.be.false;
      expect(text.startsWith('- ')).to.be.false;
      // Mark delimiters are syntax too — the view carries the mark, not the asterisks.
      expect(text).not.to.contain('**');
      expect(text).not.to.contain('`');
    }
  });

  test('inline marks become runs, and the delimiters do not', ({ expect }) => {
    const [, paragraph, , bullet] = parseBlocks(DEMO_MARKDOWN);

    // `**what is stored**` and `*a view of it*` are marked runs inside one paragraph.
    expect(paragraph.content.find((run) => run.text === 'what is stored')?.marks).to.deep.eq(['strong']);
    expect(paragraph.content.find((run) => run.text === 'a view of it')?.marks).to.deep.eq(['em']);
    // Unmarked text in the same block stays unmarked.
    expect(paragraph.content[0].marks).to.be.undefined;
    expect(blockText(paragraph)).to.eq(
      'The markdown on the left is what is stored. The blocks on the right are a view of it.',
    );

    expect(bullet.content.find((run) => run.text === 'source range')?.marks).to.deep.eq(['code']);
  });

  test('marks round-trip back to their delimiters', ({ expect }) => {
    const text = Obj.make(Text.Text, { content: DEMO_MARKDOWN });
    const view = Lens.get(text, RichTextLens);
    Lens.put(text, RichTextLens, { blocks: view.blocks });
    expect(text.content).to.eq(DEMO_MARKDOWN);
  });
});

describe('diffBlocks', () => {
  test('an edit to one block splices only that block', ({ expect }) => {
    const blocks = parseBlocks(DEMO_MARKDOWN);
    const next = blocks.map((block, index) =>
      index === 2 ? { ...block, content: plain('Why it merges now') } : block,
    );

    const writes = diffBlocks(blocks, next);
    expect(writes).to.have.length(1);
    expect(writes[0]).to.deep.include({
      kind: 'splice',
      start: blocks[2].range[0],
      deleteCount: blocks[2].range[1] - blocks[2].range[0],
      insert: '## Why it merges now',
    });

    // Applied, it changes that heading and nothing else.
    const updated = applyToString(DEMO_MARKDOWN, writes);
    expect(updated).to.contain('## Why it merges now');
    expect(updated).to.contain('# One object, two editors');
    expect(updated).to.contain('- Each block remembers its `source range`');
  });

  test('an unchanged tree produces no writes', ({ expect }) => {
    const blocks = parseBlocks(DEMO_MARKDOWN);
    expect(diffBlocks(blocks, blocks)).to.deep.eq([]);
  });

  test('two independent block edits splice independently', ({ expect }) => {
    const blocks = parseBlocks(DEMO_MARKDOWN);
    const next = blocks.map((block, index) =>
      index === 0
        ? { ...block, content: plain('Retitled') }
        : index === 4
          ? { ...block, content: plain('And a shorter one') }
          : block,
    );

    const writes = diffBlocks(blocks, next);
    expect(writes).to.have.length(2);
    const updated = applyToString(DEMO_MARKDOWN, writes);
    expect(updated).to.contain('# Retitled');
    expect(updated).to.contain('- And a shorter one');
    // The blocks between them survived untouched.
    expect(updated).to.contain('## Why it merges');
    expect(updated).to.contain('- Each block remembers its `source range`');
  });

  test('a tail append survives an edit to the last shared block', ({ expect }) => {
    // The ordering case: the last shared block is rewritten to a DIFFERENT length in the same diff as
    // an append. With the tail write emitted last it would splice at an offset the rewrite had already
    // moved, corrupting the document.
    const blocks = parseBlocks(DEMO_MARKDOWN);
    const next = [
      ...blocks.slice(0, -1),
      { ...blocks[blocks.length - 1], content: plain('A much, much longer final bullet than before') },
      { type: 'paragraph' as const, content: plain('Appended after the rewrite.'), range: [0, 0] as [number, number] },
    ];

    const updated = applyToString(DEMO_MARKDOWN, diffBlocks(blocks, next));
    expect(updated).to.contain('- A much, much longer final bullet than before');
    expect(updated).to.contain('Appended after the rewrite.');
    // The untouched region is verbatim — the property the whole lens is built around.
    expect(updated).to.contain('# One object, two editors');
    expect(updated).to.contain('## Why it merges');
    expect(updated).to.contain('- Each block remembers its `source range`');
    expect(updated).not.to.contain('So an edit splices that range alone');
  });

  test('a tail removal survives an edit to the last surviving block', ({ expect }) => {
    const blocks = parseBlocks(DEMO_MARKDOWN);
    const next = [
      ...blocks.slice(0, -2),
      { ...blocks[blocks.length - 2], content: plain('Rewritten to a very different length entirely') },
    ];

    const updated = applyToString(DEMO_MARKDOWN, diffBlocks(blocks, next));
    expect(updated).to.contain('- Rewritten to a very different length entirely');
    expect(updated).not.to.contain('So an edit splices that range alone');
    expect(updated).to.contain('# One object, two editors');
    expect(updated).to.contain('## Why it merges');
  });

  test('an appended block inserts without touching the rest', ({ expect }) => {
    const blocks = parseBlocks(DEMO_MARKDOWN);
    const next = [
      ...blocks,
      { type: 'paragraph' as const, content: plain('A new closing note.'), range: [0, 0] as [number, number] },
    ];

    const updated = applyToString(DEMO_MARKDOWN, diffBlocks(blocks, next));
    expect(updated.startsWith(DEMO_MARKDOWN)).to.be.true;
    expect(updated).to.contain('A new closing note.');
  });

  test('a removed block deletes its own span', ({ expect }) => {
    const blocks = parseBlocks(DEMO_MARKDOWN);
    const updated = applyToString(DEMO_MARKDOWN, diffBlocks(blocks, blocks.slice(0, -1)));
    expect(updated).to.contain('- Each block remembers its `source range`');
    expect(updated).not.to.contain('- So an edit splices that range alone');
  });
});

describe('the lens over a Text object', () => {
  test('reads blocks and writes splices back to content', ({ expect }) => {
    const text = Obj.make(Text.Text, { content: DEMO_MARKDOWN });

    const view = Lens.get(text, RichTextLens);
    expect(view.blocks).to.have.length(5);

    const edited = view.blocks.map((block, index) => (index === 0 ? { ...block, content: plain('Renamed') } : block));
    Lens.put(text, RichTextLens, { blocks: edited });

    expect(text.content).to.contain('# Renamed');
    // Re-reading through the lens reflects the new source, with ranges recomputed.
    const reread = Lens.get(text, RichTextLens);
    expect(blockText(reread.blocks[0])).to.eq('Renamed');
    expect(blockText(reread.blocks[2])).to.eq('Why it merges');
  });

  test('round-trips an unedited document byte-identically', ({ expect }) => {
    const text = Obj.make(Text.Text, { content: DEMO_MARKDOWN });
    const view = Lens.get(text, RichTextLens);
    Lens.put(text, RichTextLens, { blocks: view.blocks });
    expect(text.content).to.eq(DEMO_MARKDOWN);
  });
});
