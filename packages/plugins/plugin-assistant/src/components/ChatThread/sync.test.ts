// @vitest-environment jsdom

//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { type Mutable } from '@dxos/echo/internal';
import { type ContentBlock, type Message } from '@dxos/types';

import { createMessage } from '#testing';

import { blockToMarkdown } from './registry';
import { type BlockRenderer, MessageSyncer, type MessageThreadContext, type TextModel } from './sync';

class TestDocument implements TextModel {
  private readonly _view = new EditorView({ extensions: [] });

  get length() {
    return this._view.state.doc.length;
  }

  get content() {
    return this._view.state.doc.toString();
  }

  async setContent(text: string) {
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

      syncer.update(messages);
      expect(doc.content).toEqual(['<prompt>Hello</prompt>', 'Hi there!', ''].join('\n'));

      Obj.change(messages[1], (obj) => {
        obj.blocks.push({ _tag: 'text', text: 'How can I help?' });
      });
      syncer.update(messages);
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

      syncer.update(messages);
      expect(doc.content).toEqual(['<prompt>Hello</prompt>', 'Hi there!'].join('\n'));

      Obj.change(messages[1], (obj) => {
        const block = obj.blocks[0] as Mutable<ContentBlock.Text>;
        block.text = 'Hi there! How are you?';
        block.pending = false;
      });
      syncer.update(messages);

      Obj.change(messages[1], (obj) => {
        obj.blocks.push({ _tag: 'text', text: 'How can I help?' });
      });
      syncer.update(messages);
      expect(doc.content).toEqual(
        ['<prompt>Hello</prompt>', 'Hi there! How are you?', 'How can I help?', ''].join('\n'),
      );
    }),
  );

  // Regression: streaming reasoning text that passes through a bare list-marker state
  // (e.g. `"…\n1. "`) used to make `stripBulletLikeLinePrefixes` collapse the line to empty,
  // breaking the prefix-diff invariant in `MessageSyncer` and producing a duplicate `<reasoning>`
  // opening tag in the document.
  it.effect(
    'streaming reasoning with list-marker transitions does not duplicate opening tag',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();
      const syncer = new MessageSyncer(doc, blockToMarkdown);

      const setReasoning = (message: Message.Message, text: string, pending: boolean) => {
        Obj.change(message, (message) => {
          const block = message.blocks[0] as Mutable<ContentBlock.Reasoning>;
          block.reasoningText = text;
          block.pending = pending;
        });
      };

      const messages = [createMessage('assistant', [{ _tag: 'reasoning', reasoningText: 'abc\n1', pending: true }])];

      // Tick 1: `"abc\n1"` — `\d+[.)]\s` regex does not match (no dot/space yet).
      syncer.update(messages);

      // Tick 2: `"abc\n1."` — still no match (no trailing whitespace).
      setReasoning(messages[0], 'abc\n1.', true);
      syncer.update(messages);

      // Tick 3: `"abc\n1. "` — line `"1. "` matches and is stripped to empty.
      setReasoning(messages[0], 'abc\n1. ', true);
      syncer.update(messages);

      // Tick 4: `"abc\n1. foo"` — list item with content.
      setReasoning(messages[0], 'abc\n1. foo', true);
      syncer.update(messages);

      // Tick 5: finalize.
      setReasoning(messages[0], 'abc\n1. foo', false);
      syncer.update(messages);

      const openTagCount = (doc.content.match(/<reasoning>/g) ?? []).length;
      const closeTagCount = (doc.content.match(/<\/reasoning>/g) ?? []).length;
      expect(openTagCount).toBe(1);
      expect(closeTagCount).toBe(1);
    }),
  );

  // Direct test of `MessageSyncer`'s tolerance for non-monotonic renderer output —
  // any renderer that produces a shorter string for the same streaming block (e.g., due
  // to whitespace normalisation or future transforms) must not produce duplicate output.
  it.effect(
    'non-monotonic renderer output does not duplicate previously-emitted content',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();

      const renderer: BlockRenderer = (_ctx: MessageThreadContext, _msg: Message.Message, block: ContentBlock.Any) => {
        if (block._tag !== 'reasoning') {
          return undefined;
        }
        const text = block.reasoningText ?? '';
        // Simulate a non-monotonic transform: collapse a line that is a sole digit+dot+space.
        const normalised = text
          .split(/\r?\n/)
          .map((line) => line.replace(/^\s*\d+[.)]\s$/, ''))
          .join('\n')
          .trim();
        return block.pending ? `<reasoning>${normalised}` : `<reasoning>${normalised}</reasoning>\n`;
      };

      const syncer = new MessageSyncer(doc, renderer);

      const messages = [createMessage('assistant', [{ _tag: 'reasoning', reasoningText: 'abc\n1.', pending: true }])];

      syncer.update(messages);
      Obj.change(messages[0], (obj) => {
        const block = obj.blocks[0] as Mutable<ContentBlock.Reasoning>;
        block.reasoningText = 'abc\n1. ';
      });
      syncer.update(messages);
      Obj.change(messages[0], (obj) => {
        const block = obj.blocks[0] as Mutable<ContentBlock.Reasoning>;
        block.reasoningText = 'abc\n1. tail';
        block.pending = false;
      });
      syncer.update(messages);

      const openTagCount = (doc.content.match(/<reasoning>/g) ?? []).length;
      const closeTagCount = (doc.content.match(/<\/reasoning>/g) ?? []).length;
      expect(openTagCount).toBe(1);
      expect(closeTagCount).toBe(1);
    }),
  );
});
