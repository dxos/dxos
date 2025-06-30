//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { SerializationModel, DocumentAdapter, type ChunkRenderer } from './model';

const blockToMarkdown: ChunkRenderer<DataType.Message> = (
  message: DataType.Message,
  index: number,
  debug = true,
): string[] => {
  return [
    `###### ${message.sender.name}`,
    ...message.blocks.filter((block) => block.type === 'transcription').map((block) => block.text),
    '',
  ];
};

const createDate = () => new Date().toISOString();

describe('SerializationModel', () => {
  test('basic', ({ expect }) => {
    const model = new SerializationModel<DataType.Message>(blockToMarkdown);
    expect(model.chunks.length).to.eq(0);
    expect(model.doc.toString()).to.eq('');

    // Create message.
    const message = Obj.make(DataType.Message, {
      created: createDate(),
      sender: { name: 'Alice' },
      blocks: [
        {
          type: 'transcription',
          started: createDate(),
          text: 'Hello world!',
        },
      ],
    });
    model.appendChunk(message);
    {
      const text = model.doc.toString();
      expect(text).to.eq('###### Alice\nHello world!\n\n');
      expect(model.chunks.length).to.eq(1);
    }

    // Update message.
    message.blocks.push({ type: 'transcription', started: createDate(), text: 'Hello again!' });
    model.updateChunk(message);
    {
      const text = model.doc.toString();
      expect(text).to.eq('###### Alice\nHello world!\nHello again!\n\n');
      expect(model.chunks.length).to.eq(1);
    }
  });

  test('sync - append', ({ expect }) => {
    const view = new EditorView({ extensions: [], doc: '' });
    const model = new SerializationModel<DataType.Message>(blockToMarkdown);
    const adapter = new DocumentAdapter(view);
    expect(adapter.lineCount()).to.eq(0);
    expect(view.state.doc.toString()).to.eq('');

    // Append message.
    {
      const message = Obj.make(DataType.Message, {
        created: createDate(),
        sender: { name: 'Alice' },
        blocks: [
          {
            type: 'transcription',
            started: createDate(),
            text: 'Hello world!',
          },
        ],
      });
      model.appendChunk(message);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello world!\n\n');
    }

    // Append message.
    {
      const message = Obj.make(DataType.Message, {
        created: createDate(),
        sender: { name: 'Bob' },
        blocks: [
          {
            type: 'transcription',
            started: createDate(),
            text: 'Hello world!',
          },
        ],
      });
      model.appendChunk(message);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello world!\n\n###### Bob\nHello world!\n\n');
    }
  });

  test('sync - append, update, delete', ({ expect }) => {
    const view = new EditorView({ extensions: [], doc: '' });
    const model = new SerializationModel<DataType.Message>(blockToMarkdown);
    const adapter = new DocumentAdapter(view);
    expect(adapter.lineCount()).to.eq(0);

    // Append message.
    {
      const message = Obj.make(DataType.Message, {
        created: createDate(),
        sender: { name: 'Alice' },
        blocks: [
          {
            type: 'transcription',
            started: createDate(),
            text: 'Hello world!',
          },
        ],
      });
      model.appendChunk(message);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello world!\n\n');

      // Update message (add block).
      message.blocks.push({ type: 'transcription', started: createDate(), text: 'Hello again!' });
      model.updateChunk(message);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello world!\nHello again!\n\n');

      // Update message (remove block).
      message.blocks.splice(0, 1);
      model.updateChunk(message);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello again!\n\n');

      expect(model.getChunkAtLine(1)).to.eq(message);
    }

    // Append message.
    {
      const message = Obj.make(DataType.Message, {
        created: createDate(),
        sender: { name: 'Bob' },
        blocks: [{ type: 'transcription', started: createDate(), text: 'Hello again!' }],
      });
      model.appendChunk(message);
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Alice\nHello again!\n\n###### Bob\nHello again!\n\n');

      expect(model.getChunkAtLine(4)).to.eq(message);
    }

    // Delete block.
    {
      model.deleteBlock('1');
      model.sync(adapter);
      expect(view.state.doc.toString()).to.eq('###### Bob\nHello again!\n\n');
    }
  });
});
