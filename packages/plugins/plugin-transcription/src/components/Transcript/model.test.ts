//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { BlockModel, DocumentAdapter, type BlockRenderer } from './model';
import { type TranscriptBlock } from '../../types';

const blockToMarkdown: BlockRenderer<TranscriptBlock> = (block: TranscriptBlock, debug = true): string[] => {
  return [`###### ${block.authorName}`, ...block.segments.map((segment) => segment.text), ''];
};

describe('BlockModel', () => {
  test('basic', ({ expect }) => {
    const model = new BlockModel<TranscriptBlock>(blockToMarkdown);
    expect(model.blocks.length).to.eq(0);
    expect(model.doc.toString()).to.eq('');

    // Create block.
    const block = { id: '1', authorName: 'Alice', segments: [{ started: new Date(), text: 'Hello world!' }] };
    model.appendBlock(block);
    {
      const text = model.doc.toString();
      expect(text).to.eq('###### Alice\nHello world!\n\n');
      expect(model.blocks.length).to.eq(1);
    }

    // Update block.
    block.segments.push({ started: new Date(), text: 'Hello again!' });
    model.updateBlock(block);
    {
      const text = model.doc.toString();
      expect(text).to.eq('###### Alice\nHello world!\nHello again!\n\n');
      expect(model.blocks.length).to.eq(1);
    }
  });

  test('sync - append', ({ expect }) => {
    const view = new EditorView({ extensions: [], doc: '' });
    const model = new BlockModel<TranscriptBlock>(blockToMarkdown);
    const adapter = new DocumentAdapter(view);
    expect(adapter.lineCount()).to.eq(0);
    expect(view.state.doc.toString()).to.eq('');

    // Append block.
    {
      const block = { id: '1', authorName: 'Alice', segments: [{ started: new Date(), text: 'Hello world!' }] };
      model.appendBlock(block);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello world!\n\n');
    }

    // Append block.
    {
      const block = { id: '2', authorName: 'Bob', segments: [{ started: new Date(), text: 'Hello world!' }] };
      model.appendBlock(block);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello world!\n\n###### Bob\nHello world!\n\n');
    }
  });

  test('sync - append, update, delete', ({ expect }) => {
    const view = new EditorView({ extensions: [], doc: '' });
    const model = new BlockModel<TranscriptBlock>(blockToMarkdown);
    const adapter = new DocumentAdapter(view);
    expect(adapter.lineCount()).to.eq(0);

    // Append block.
    {
      const block = { id: '1', authorName: 'Alice', segments: [{ started: new Date(), text: 'Hello world!' }] };
      model.appendBlock(block);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello world!\n\n');

      // Update block (add segment).
      block.segments.push({ started: new Date(), text: 'Hello again!' });
      model.updateBlock(block);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello world!\nHello again!\n\n');

      // Update block (remove segment).
      block.segments.splice(0, 1);
      model.updateBlock(block);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello again!\n\n');

      expect(model.getBlockAtLine(1)).to.eq(block);
    }

    // Append block.
    {
      const block = { id: '2', authorName: 'Bob', segments: [{ started: new Date(), text: 'Hello again!' }] };
      model.appendBlock(block);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello again!\n\n###### Bob\nHello again!\n\n');

      expect(model.getBlockAtLine(4)).to.eq(block);
    }

    // Delete block.
    {
      model.deleteBlock('1');
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Bob\nHello again!\n\n');
    }
  });
});
