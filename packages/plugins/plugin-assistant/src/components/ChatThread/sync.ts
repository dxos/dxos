//
// Copyright 2025 DXOS.org
//

import { type URI } from '@dxos/keys';
import { type MarkdownStreamController } from '@dxos/react-ui-markdown';
import { type ChunkDocument, type ChunkDocumentChange, ChunkModel } from '@dxos/react-ui-thread/model';
import { type ContentBlock, type Message } from '@dxos/types';
import { type StateDispatch, type XmlWidgetStateManager } from '@dxos/ui-editor';

import { rehydrateToolWidgetsFromMessages } from './tool-widget-state';

/**
 * Update document.
 */
export type TextModel = Pick<MarkdownStreamController, 'length' | 'setContent' | 'append' | 'updateWidget'>;

/**
 * Document offset range occupied by a message's rendered blocks. Positions are in the same
 * space as the CodeMirror document (i.e. what {@link MarkdownStreamController.scrollTo} and
 * {@link MarkdownStreamController.getVisibleRange} operate on).
 */
export type MessageRange = { id: string; from: number; to: number };

/**
 * Renders a block to markdown.
 *
 * Contract: for any block whose lifetime spans multiple invocations (i.e. a streaming block
 * with `pending: true` whose content grows over time, transitioning to `pending: false`), the
 * sequence of returned strings must be monotonically extending — each subsequent value must be
 * a string-extension of the previous. Non-monotonic output is tolerated but costs the append
 * path: the document is rewritten rather than streamed.
 */
export type BlockRenderer = (
  context: MessageThreadContext,
  message: Message.Message,
  block: ContentBlock.Any,
) => string | undefined;

/**
 * Thread context passed to renderer.
 * This enables the renderer to "stream" content into the widget state.
 */
export class MessageThreadContext implements Pick<MarkdownStreamController, 'updateWidget'> {
  constructor(private readonly _widgetState?: XmlWidgetStateManager) {}

  updateWidget<T>(id: string, value: StateDispatch<T>) {
    this._widgetState?.updateWidget(id, value);
  }

  // TODO(burdon): Resolve name from hypergraph.
  getObjectLabel(_id: URI.URI) {
    return 'Object';
  }
}

/** One rendered block; the unit the model orders and caches. */
type BlockChunk = { id: string; messageId: string; message: Message.Message; block: ContentBlock.Any };

/**
 * Cache key for a block's rendering. A pending block re-renders every pass because its content is
 * still growing; a finalized one is rendered exactly once and cached from then on, which is what
 * keeps `applyToolBlockToWidgetState` — which *appends* a tool result to widget state — from
 * folding the same result in twice. Identity is deliberately not used: ECHO may mint a fresh proxy
 * per property access, so a block object is not stable enough to compare.
 */
const FINALIZED = Symbol('finalized');

const toChunks = (messages: Message.Message[]): BlockChunk[] =>
  messages.flatMap((message) =>
    message.blocks.map((block, index) => ({
      id: `${message.id}:${index}`,
      messageId: message.id,
      message,
      block,
    })),
  );

/**
 * Syncs messages with the editor, over the shared {@link ChunkModel}.
 *
 * Reflects the AI streaming contract:
 * - Messages and their blocks are appended in order.
 * - Only the last block in `messages` may be `pending`; all earlier blocks are finalized.
 * - The renderer's output for a streaming block grows monotonically (see {@link BlockRenderer}).
 * - The document is read-only outside this syncer.
 *
 * The document sink offers only whole-document replace and append, so any change the model reports
 * as a replace lands as `setContent` — the same full-document rewrite this class did before, and
 * the reason widget state is rehydrated after it.
 */
export class MessageSyncer {
  readonly #model: ChunkModel<BlockChunk>;
  readonly #context: MessageThreadContext;
  readonly #sink: ChunkDocument;

  /** Identity sentinel; a change of `messages[0]` means a different thread. */
  #threadId?: string;

  /** Messages of the pass being synced, for rehydration after a document replace. */
  #messages: Message.Message[] = [];

  constructor(
    private readonly _document: TextModel,
    private readonly _renderer: BlockRenderer,
  ) {
    this.#context = new MessageThreadContext(this._document);
    this.#model = new ChunkModel<BlockChunk>(
      ({ message, block }) => this._renderer(this.#context, message, block) ?? '',
      { getRevision: ({ block }) => (block.pending ? {} : FINALIZED) },
    );
    this.#sink = {
      apply: (change: ChunkDocumentChange) => {
        if (change.type === 'append') {
          void this._document.append(change.text);
        } else {
          // `setContent` uses `wireBypass`, so the editor jumps straight to the final text rather
          // than typing it out, and clears widget state via `xmlTagResetEffect` — hence the
          // rehydrate. Live streaming partials take the append path above and keep the typewriter.
          const messages = this.#messages;
          void this._document.setContent(this.#model.text).then(() => {
            rehydrateToolWidgetsFromMessages(this.#context, messages);
          });
        }
      },
    };
  }

  get context() {
    return this.#context;
  }

  /**
   * Per-message document offset ranges, in document order. Valid synchronously after
   * {@link reset} or {@link update} (the offsets are derived from the same rendered buffer
   * that is dispatched to the document).
   */
  getRanges(): MessageRange[] {
    const ranges = new Map<string, MessageRange>();
    for (const { id, from, to } of this.#model.getRanges()) {
      // Chunk ids are `${messageId}:${blockIndex}`; a message spans its blocks' ranges.
      const messageId = id.slice(0, id.lastIndexOf(':'));
      const existing = ranges.get(messageId);
      if (existing) {
        existing.to = to;
      } else {
        ranges.set(messageId, { id: messageId, from, to });
      }
    }

    return Array.from(ranges.values());
  }

  /**
   * Replace the document with the rendering of `messages`. Use on mount, on thread switch,
   * and from {@link update} when it detects an identity change in `messages[0]`.
   */
  reset(messages: Message.Message[] = []): void {
    this.#threadId = messages[0]?.id;
    this.#messages = messages;
    // Clearing the chunks drops the render cache, so every block renders again into the widget
    // state the imminent `setContent` is about to clear.
    this.#model.reset();
    this.#model.set(toChunks(messages));
    this.#forceReplace();
  }

  /**
   * Stream the suffix of the rendered messages into the document.
   * Returns `true` if the document was replaced (initial mount or thread switch), `false`
   * if the call was a streaming append (or a no-op).
   */
  update(messages: Message.Message[]): boolean {
    if (messages[0]?.id !== this.#threadId) {
      this.reset(messages);
      return true;
    }

    this.#messages = messages;
    this.#model.set(toChunks(messages)).sync(this.#sink);
    return false;
  }

  /**
   * Write the whole document even when the diff would have been an append, so a reset always lands
   * through `setContent` — mount and thread switch must bypass the typewriter rather than type the
   * backlog out, and must clear widget state left by the previous thread.
   */
  #forceReplace(): void {
    this.#model.rebase(this.#model.text);
    this.#sink.apply({ type: 'replace', from: 0, to: 0, text: this.#model.text });
  }
}
