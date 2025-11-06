//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { createMessage } from '../../testing';

import { blockToMarkdown } from './registry';
import { MessageSyncer, type TextModel } from './sync';

class TestDocument implements TextModel {
  private readonly _view = new EditorView({ extensions: [] });

  get view() {
    return this._view;
  }

  get content() {
    return this._view.state.doc.toString();
  }

  async reset(text: string) {
    this._view.dispatch({
      changes: { from: 0, to: this._view.state.doc.length, insert: text },
    });
  }

  async append(text: string) {
    this._view.dispatch({
      changes: { from: this._view.state.doc.length, insert: text },
    });
  }

  updateWidget(_id: string, _value: any) {}
}

describe('reducers', () => {
  it.effect(
    'basic sync',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();
      const syncer = new MessageSyncer(doc, blockToMarkdown);

      const messages = [
        createMessage('user', [{ _tag: 'text', text: 'Hello' }]),
        createMessage('assistant', [{ _tag: 'text', text: 'Hi there!' }]),
      ];

      syncer.append(messages);
      expect(doc.content).toEqual(['<prompt>Hello</prompt>', 'Hi there!', ''].join('\n'));

      messages[1].blocks.push({ _tag: 'text', text: 'How can I help?' });
      syncer.append(messages);
      expect(doc.content).toEqual(['<prompt>Hello</prompt>', 'Hi there!', 'How can I help?', ''].join('\n'));
    }),
  );

  it.effect(
    'sync with partial updates',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();
      const syncer = new MessageSyncer(doc, blockToMarkdown);

      const messages = [
        createMessage('user', [{ _tag: 'text', text: 'Hello' }]),
        createMessage('assistant', [{ _tag: 'text', text: 'Hi there!', pending: true }]),
      ];

      syncer.append(messages);
      expect(doc.content).toEqual(['<prompt>Hello</prompt>', 'Hi there!'].join('\n'));

      const block = messages[1].blocks[0] as ContentBlock.Text;
      block.text = 'Hi there! How are you?';
      block.pending = false;
      syncer.append(messages);

      messages[1].blocks.push({ _tag: 'text', text: 'How can I help?' });
      syncer.append(messages);
      expect(doc.content).toEqual(
        ['<prompt>Hello</prompt>', 'Hi there! How are you?', 'How can I help?', ''].join('\n'),
      );
    }),
  );
});
