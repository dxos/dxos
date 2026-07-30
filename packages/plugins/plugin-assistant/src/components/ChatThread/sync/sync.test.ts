//
// Copyright 2025 DXOS.org
//

// @vitest-environment jsdom

import { EditorView } from '@codemirror/view';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { type Mutable } from '@dxos/echo/Obj';
import { type ContentBlock, type Message } from '@dxos/types';

import { createMessage } from '#testing';

import { createBlockRenderer } from '../registry';
import { type BlockRenderer, MessageSyncer, type MessageThreadContext, type TextModel } from '../sync/sync';

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
      const syncer = new MessageSyncer(doc, createBlockRenderer('thinking'));

      const messages = [
        createMessage('user', [{ _tag: 'text', text: 'Hello' }]),
        createMessage('assistant', [{ _tag: 'text', text: 'Hi there!' }]),
      ];

      syncer.update(messages);
      expect(normalize(doc.content)).toEqual('\n<prompt>Hello</prompt>\n<branch />\n\nHi there!\n');

      Obj.update(messages[1], (obj) => {
        obj.blocks.push({ _tag: 'text', text: 'How can I help?' });
      });
      syncer.update(messages);
      expect(normalize(doc.content)).toEqual('\n<prompt>Hello</prompt>\n<branch />\n\nHi there!\nHow can I help?\n');
    }),
  );

  it.effect(
    'sync with partial updates',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();
      const syncer = new MessageSyncer(doc, createBlockRenderer('thinking'));

      const messages = [
        createMessage('user', [{ _tag: 'text', text: 'Hello' }]),
        createMessage('assistant', [{ _tag: 'text', text: 'Hi there!', pending: true }]),
      ];

      syncer.update(messages);
      expect(normalize(doc.content)).toEqual('\n<prompt>Hello</prompt>\n<branch />\n\nHi there!');

      Obj.update(messages[1], (obj) => {
        const block = obj.blocks[0] as Mutable<ContentBlock.Text>;
        block.text = 'Hi there! How are you?';
        block.pending = false;
      });
      syncer.update(messages);

      Obj.update(messages[1], (obj) => {
        obj.blocks.push({ _tag: 'text', text: 'How can I help?' });
      });
      syncer.update(messages);
      expect(normalize(doc.content)).toEqual(
        '\n<prompt>Hello</prompt>\n<branch />\n\nHi there! How are you?\nHow can I help?\n',
      );
    }),
  );

  it.effect(
    'tracks per-message document ranges',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();
      const syncer = new MessageSyncer(doc, createBlockRenderer('thinking'));

      const messages = [
        createMessage('user', [{ _tag: 'text', text: 'Hello' }]),
        createMessage('assistant', [{ _tag: 'text', text: 'Hi there!' }]),
      ];

      syncer.update(messages);
      const spans = syncer.getSpans();
      expect(spans.map((range) => range.id)).toEqual([messages[0].id, messages[1].id]);
      // Ranges tile the document contiguously and slice back to each message's rendered content.
      expect(spans[0].from).toEqual(0);
      expect(spans[1].from).toEqual(spans[0].to);
      expect(spans[1].to).toEqual(doc.length);
      expect(doc.content.slice(spans[0].from, spans[0].to)).toContain('<prompt>Hello</prompt>');
      expect(doc.content.slice(spans[1].from, spans[1].to)).toContain('Hi there!');

      // Appending to the last message extends its range through the append path.
      Obj.update(messages[1], (obj) => {
        obj.blocks.push({ _tag: 'text', text: 'How can I help?' });
      });
      syncer.update(messages);
      const extended = syncer.getSpans();
      expect(extended).toHaveLength(2);
      expect(extended[0].to).toEqual(spans[0].to);
      expect(extended[1].to).toEqual(doc.length);
      expect(doc.content.slice(extended[1].from, extended[1].to)).toContain('How can I help?');
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
      const syncer = new MessageSyncer(doc, createBlockRenderer('thinking'));

      const setReasoning = (message: Message.Message, text: string, pending: boolean) => {
        Obj.update(message, (message) => {
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

  // Regression: prompt "respond with your name inside an xml tag" produces a streamed
  // reasoning block followed by a text block containing a non-registered XML tag
  // (`<name>Claude</name>`). The text block must appear in the document AFTER the
  // closed reasoning block — the bug symptom is the reasoning tag rendering with no
  // follow-up response visible.
  it.effect(
    'reasoning block followed by text containing a non-registered xml tag',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();
      const syncer = new MessageSyncer(doc, createBlockRenderer('thinking'));

      const setReasoning = (message: Message.Message, text: string, pending: boolean) => {
        Obj.update(message, (message) => {
          const block = message.blocks[0] as Mutable<ContentBlock.Reasoning>;
          block.reasoningText = text;
          block.pending = pending;
        });
      };

      const setText = (message: Message.Message, text: string, pending: boolean) => {
        Obj.update(message, (message) => {
          const block = message.blocks[1] as Mutable<ContentBlock.Text>;
          block.text = text;
          block.pending = pending;
        });
      };

      // Tick 1: reasoning starts streaming.
      const messages = [createMessage('assistant', [{ _tag: 'reasoning', reasoningText: 'Thinking', pending: true }])];
      syncer.update(messages);

      // Tick 2: reasoning grows.
      setReasoning(messages[0], 'Thinking about the answer', true);
      syncer.update(messages);

      // Tick 3: reasoning closes.
      setReasoning(messages[0], 'Thinking about the answer', false);
      syncer.update(messages);

      // Tick 4: text block appears, pending and empty (model has started emitting but text is still '').
      Obj.update(messages[0], (message) => {
        message.blocks.push({ _tag: 'text', text: '', pending: true });
      });
      syncer.update(messages);

      // Tick 5: partial text — opening tag only.
      setText(messages[0], '<name>', true);
      syncer.update(messages);

      // Tick 6: full text streamed.
      setText(messages[0], '<name>Claude</name>', true);
      syncer.update(messages);

      // Tick 7: text finalised.
      setText(messages[0], '<name>Claude</name>', false);
      syncer.update(messages);

      // Both the closed reasoning tag and the response text must be present.
      expect(doc.content).toContain('<reasoning>Thinking about the answer</reasoning>');
      expect(doc.content).toContain('<name>Claude</name>');

      const openReasoning = (doc.content.match(/<reasoning>/g) ?? []).length;
      const closeReasoning = (doc.content.match(/<\/reasoning>/g) ?? []).length;
      expect(openReasoning).toBe(1);
      expect(closeReasoning).toBe(1);
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
      Obj.update(messages[0], (obj) => {
        const block = obj.blocks[0] as Mutable<ContentBlock.Reasoning>;
        block.reasoningText = 'abc\n1. ';
      });
      syncer.update(messages);
      Obj.update(messages[0], (obj) => {
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

describe('MessageSyncer tool widget rehydration', () => {
  it.effect(
    'restores tool widget state after reset replaces the document',
    Effect.fnUntraced(function* (_) {
      const updates: { id: string; value: any }[] = [];
      class RecordingDocument extends TestDocument {
        override updateWidget(id: string, value: any) {
          updates.push({ id, value });
        }
      }

      const document = new RecordingDocument();
      const syncer = new MessageSyncer(document, createBlockRenderer('thinking'));
      const messages = [
        createMessage('assistant', [
          { _tag: 'toolCall', toolCallId: 'abc', name: 'search', input: '{}', providerExecuted: false },
        ]),
        createMessage('user', [
          { _tag: 'toolResult', toolCallId: 'abc', name: 'search', result: 'ok', providerExecuted: false },
        ]),
      ] as Message.Message[];

      syncer.reset(messages);
      // `reset` rehydrates in a promise continuation after `setContent`.
      yield* Effect.promise(() => Promise.resolve());
      yield* Effect.promise(() => Promise.resolve());

      // Reduce the dispatches the way the widget state store does: each is either a value or a
      // function of the previous state, applied in arrival order.
      const forTool = updates.filter((update) => update.id === 'abc');
      expect(forTool.length).toBeGreaterThan(0);
      const state = forTool.reduce<{ blocks: ContentBlock.Any[] }>(
        (previous, { value }) => (typeof value === 'function' ? value(previous) : value),
        { blocks: [] },
      );
      expect(state.blocks.map((block) => block._tag)).toEqual(['toolCall', 'toolResult']);
    }),
  );

  // Regression: the prompt was built with an indented `trim` template, which dedents by the minimum
  // indent across all lines — so a multi-line prompt, contributing lines at zero indent, left the source
  // file's indentation in the document. At 4+ spaces CommonMark reads an indented code block, so neither
  // the prompt nor the toolbar parsed as an element and the turn rendered as raw text.
  it.effect(
    'a multi-line prompt emits unindented markup',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();
      const syncer = new MessageSyncer(doc, createBlockRenderer('thinking'));

      const prompt = createMessage('user', [{ _tag: 'text', text: 'this is a list:\n- foo\n- bar' }]);
      syncer.update([prompt]);

      const indented = doc.content.split('\n').filter((line) => /^\s+\S/.test(line));
      expect(indented).toEqual([]);
      expect(normalize(doc.content)).toContain('<prompt>this is a list:\n- foo\n- bar</prompt>\n<branch />');
    }),
  );

  // Regression: `update` streams a suffix, so an append-only path leaves removed turns on screen. A
  // rewind shrinks the thread, which has to fall back to a full reset.
  it.effect(
    'a shrinking message list replaces the document',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();
      const syncer = new MessageSyncer(doc, createBlockRenderer('thinking'));

      const prompt = createMessage('user', [{ _tag: 'text', text: 'Hello' }]);
      const reply = createMessage('assistant', [{ _tag: 'text', text: 'Hi there!' }]);
      syncer.update([prompt, reply]);
      expect(doc.content).toContain('Hi there!');

      // The rewind case: same first message, fewer turns.
      const replaced = syncer.update([prompt]);
      expect(replaced).toBe(true);
      expect(doc.content).not.toContain('Hi there!');
      expect(doc.content).toContain('Hello');
    }),
  );

  it.effect(
    'a message list diverging mid-thread replaces the document',
    Effect.fn(function* ({ expect }) {
      const doc = new TestDocument();
      const syncer = new MessageSyncer(doc, createBlockRenderer('thinking'));

      const prompt = createMessage('user', [{ _tag: 'text', text: 'Hello' }]);
      const abandoned = createMessage('assistant', [{ _tag: 'text', text: 'Abandoned.' }]);
      syncer.update([prompt, abandoned]);

      // Same length, different second turn — the branch changed underneath us.
      const retry = createMessage('assistant', [{ _tag: 'text', text: 'Retry.' }]);
      expect(syncer.update([prompt, retry])).toBe(true);
      expect(doc.content).not.toContain('Abandoned.');
      expect(doc.content).toContain('Retry.');
    }),
  );

  // Regression: widget callbacks reach the thread through the syncer's context, which the host has to
  // publish to the editor via `setContext`. Nothing did, so a widget received `context: undefined` and
  // the rewind button silently no-oped.
  it.effect(
    'exposes a context routing widget callbacks to the handlers',
    Effect.fn(function* ({ expect }) {
      const rewound: string[] = [];
      const syncer = new MessageSyncer(new TestDocument(), createBlockRenderer('thinking'), {
        onRewind: (id) => rewound.push(id),
      });

      expect(syncer.context).toBeDefined();
      syncer.context.rewind('msg-1');
      expect(rewound).toEqual(['msg-1']);
    }),
  );
});

/**
 * Canonicalizes the rendered document for comparison:
 * - the branch toolbar's attributes, since `messageId` is a fresh ULID and `created` a wall-clock
 *   timestamp, so neither is stable across runs;
 * - the run of leading newlines, which is presentational padding above the first block and is tuned
 *   independently — these tests are about the block sequence and the incremental append path.
 */
const normalize = (content: string) => content.replace(/<branch\b[^>]*\/>/g, '<branch />').replace(/^\n+/, '\n');
