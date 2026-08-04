//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  WidgetType,
  gutter,
  hoverTooltip,
  keymap,
} from '@codemirror/view';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

import { type ThemeMode } from '@dxos/react-ui';
import { Domino } from '@dxos/ui';
import { createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { type ChunkModel } from '../model';
import { type MessageLike, type MessageMetadata, type MessageReaction, type MessageThreadSummary } from '../types';
import { type MessageDocumentItem, type MessageItem } from './message-document-items';

/** Dispatched after the model syncs, so decorations rebuild against ranges the document now matches. */
export const messageDocumentChangedEffect = StateEffect.define<null>();

/**
 * View state that is not the document: which message is being edited, and which is current.
 *
 * Carried in editor state rather than in the options object, because the options are captured when
 * the editor is built — putting either there would rebuild the whole editor to move a highlight.
 */
export type MessageDocumentState = { editingId?: string; currentId?: string };

export const setMessageDocumentStateEffect = StateEffect.define<MessageDocumentState>();

const messageDocumentState = StateField.define<MessageDocumentState>({
  create: () => ({}),
  update: (value, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(setMessageDocumentStateEffect)) {
        return effect.value;
      }
    }

    return value;
  },
});

export type MessageAction = 'react' | 'reply' | 'thread' | 'edit' | 'delete';

/** A reply's target, resolved by the host — this package never follows the ref itself. */
export type MessageQuote = { authorName?: string; text: string };

export type MessageDocumentOptions = {
  model: ChunkModel<MessageDocumentItem>;
  getMetadata: (message: MessageLike) => MessageMetadata;
  getReactions?: (message: MessageLike) => MessageReaction[];
  /** The message a reply targets; omitted (or undefined) renders no quote. */
  getQuote?: (message: MessageLike) => MessageQuote | undefined;
  /** Folded thread beneath a message; omitted renders no thread row. */
  getThreadSummary?: (message: MessageLike) => MessageThreadSummary | undefined;
  /** Actions the hover toolbar offers for a message; an empty result hides it. */
  getActions?: (item: MessageItem) => MessageAction[];
  onAction?: (action: MessageAction, message: MessageLike) => void;
  onReact?: (message: MessageLike, emoji: string) => void;
  onThreadOpen?: (message: MessageLike) => void;
  onSelect?: (message: MessageLike) => void;
  /** Commit an edit; the host writes it back and clears the editing state. */
  onEditCommit?: (message: MessageLike, text: string) => void;
  onEditCancel?: (message: MessageLike) => void;
  /** Nested edit editors need the host's theme, which they cannot read from React context. */
  themeMode?: ThemeMode;
  /** Copy for the thread row, so this package does not reach for a translation namespace mid-render. */
  labels?: { startThread: string; replyCount: (count: number) => string };
};

//
// Widgets
//

/** Author and time above the first message of a run. */
class HeadingWidget extends WidgetType {
  constructor(
    private readonly _name: string,
    private readonly _time: string,
  ) {
    super();
  }

  override eq(other: this) {
    return this._name === other._name && this._time === other._time;
  }

  override toDOM() {
    return Domino.of('div')
      .classNames('flex items-baseline gap-2 pbs-2')
      .append(
        Domino.of('span').classNames('text-sm font-medium text-base-fg').text(this._name),
        Domino.of('span').classNames('text-xs text-description').text(this._time),
      ).root;
  }
}

class DividerWidget extends WidgetType {
  constructor(private readonly _label?: string) {
    super();
  }

  override eq(other: this) {
    return this._label === other._label;
  }

  override toDOM() {
    const rule = () => Domino.of('div').classNames('grow bs-px bg-separator');
    return this._label
      ? Domino.of('div')
          .classNames('flex items-center gap-2 pli-2 plb-2 text-xs text-description')
          .append(rule(), Domino.of('span').classNames('shrink-0').text(this._label), rule()).root
      : Domino.of('div').classNames('pli-2 plb-2').append(rule()).root;
  }
}

class ReactionsWidget extends WidgetType {
  constructor(
    private readonly _reactions: MessageReaction[],
    private readonly _onReact?: (emoji: string) => void,
  ) {
    super();
  }

  override eq(other: this) {
    return (
      this._reactions.length === other._reactions.length &&
      this._reactions.every(
        (reaction, index) =>
          reaction.emoji === other._reactions[index].emoji &&
          reaction.count === other._reactions[index].count &&
          reaction.self === other._reactions[index].self,
      )
    );
  }

  override toDOM() {
    const row = Domino.of('div').classNames('flex flex-wrap gap-1 pbe-1');
    for (const { emoji, count, self } of this._reactions) {
      row.append(
        Domino.of('button')
          .classNames('dx-tag dx-tag--button')
          .attributes({
            'type': 'button',
            'aria-pressed': self ? 'true' : 'false',
            'data-testid': 'thread.document.pill',
          })
          .data('emoji', emoji)
          .text(`${emoji} ${count}`)
          .on('click', () => this._onReact?.(emoji)),
      );
    }

    return row.root;
  }

  // The pills are interactive, so the editor must not treat a click on them as a click on the text.
  override ignoreEvent() {
    return false;
  }
}

/** Compact reference to the message a reply targets, above the reply's own body. */
class QuoteWidget extends WidgetType {
  constructor(private readonly _quote: MessageQuote) {
    super();
  }

  override eq(other: this) {
    return this._quote.authorName === other._quote.authorName && this._quote.text === other._quote.text;
  }

  override toDOM() {
    return (
      Domino.of('div')
        .classNames('flex items-center gap-1.5 pbe-0.5 text-xs text-description min-is-0')
        .attributes({ 'data-testid': 'thread.document.quote' })
        // Appended one at a time: `append` fixes its children to a single element type, and this row
        // mixes an SVG with spans.
        .append(Domino.svg('ph--arrow-bend-up-left--regular').classNames('shrink-0 text-subdued'))
        .append(
          Domino.of('span')
            .classNames('shrink-0 font-medium')
            .text(this._quote.authorName ?? ''),
        )
        .append(Domino.of('span').classNames('truncate min-is-0').text(this._quote.text)).root
    );
  }
}

/** Thread affordance beneath a message: its name, reply count and last activity. */
class ThreadLinkWidget extends WidgetType {
  constructor(
    private readonly _summary: MessageThreadSummary,
    private readonly _label: string,
    private readonly _onOpen?: () => void,
  ) {
    super();
  }

  override eq(other: this) {
    return (
      this._summary.name === other._summary.name &&
      this._summary.replyCount === other._summary.replyCount &&
      this._summary.lastActivity === other._summary.lastActivity &&
      this._label === other._label
    );
  }

  override toDOM() {
    const { name, lastActivity } = this._summary;
    const row = Domino.of('button')
      .classNames('flex items-center gap-1.5 plb-1 text-xs text-accentText rounded-sm dx-focus-ring min-is-0')
      .attributes({ 'type': 'button', 'data-testid': 'thread.document.open-thread' })
      .append(Domino.svg('ph--chats-circle--regular'));
    if (name) {
      row.append(Domino.of('span').classNames('truncate min-is-0 font-medium').text(name));
    }
    row.append(Domino.of('span').classNames('shrink-0').text(this._label));
    if (lastActivity) {
      const date = new Date(lastActivity);
      if (!Number.isNaN(date.getTime())) {
        row.append(
          Domino.of('span')
            .classNames('shrink-0 text-description')
            .text(formatDistanceToNow(date, { addSuffix: true })),
        );
      }
    }

    return row.on('click', () => this._onOpen?.()).root;
  }

  override ignoreEvent() {
    return false;
  }
}

/**
 * The message body, swapped for an editor over the same text.
 *
 * A nested `EditorView` rather than an editable region of the transcript: the transcript document
 * is a rendering, so making part of it writable would have the user typing into something that the
 * next model sync overwrites.
 */
class EditWidget extends WidgetType {
  #view?: EditorView;

  constructor(
    private readonly _id: string,
    private readonly _text: string,
    private readonly _themeMode: ThemeMode | undefined,
    private readonly _onCommit: (text: string) => void,
    private readonly _onCancel: () => void,
  ) {
    super();
  }

  override eq(other: this) {
    return this._id === other._id && this._text === other._text;
  }

  override toDOM() {
    const root = Domino.of('div').classNames('plb-1').attributes({ 'data-testid': 'thread.document.editor' }).root;
    this.#view = new EditorView({
      parent: root,
      doc: this._text,
      extensions: [
        // Ahead of the basic extensions and at the highest precedence: both bind Enter, and
        // CodeMirror breaks precedence ties by extension order, so listing these second would let
        // the default newline swallow the commit.
        Prec.highest(
          keymap.of([
            { key: 'Enter', run: () => (this.#commit(), true) },
            { key: 'Escape', run: () => (this._onCancel(), true) },
          ]),
        ),
        createBasicExtensions({ lineWrapping: true }),
        createThemeExtensions({ themeMode: this._themeMode }),
      ],
    });
    // The caret has to leave the transcript for typing to reach the nested editor at all.
    queueMicrotask(() => this.#view?.focus());
    return root;
  }

  override destroy() {
    this.#view?.destroy();
    this.#view = undefined;
  }

  override ignoreEvent() {
    return false;
  }

  #commit() {
    const text = this.#view?.state.doc.toString() ?? this._text;
    this._onCommit(text);
  }
}

class AvatarMarker extends GutterMarker {
  constructor(private readonly _metadata: MessageMetadata) {
    super();
  }

  override eq(other: this) {
    return this._metadata.authorId === other._metadata.authorId;
  }

  override toDOM() {
    const { authorAvatarProps, authorName } = this._metadata;
    return Domino.of('div')
      .classNames('flex items-center justify-center is-6 bs-6 rounded-full text-xs bg-groupSurface')
      .attributes({ 'data-hue': authorAvatarProps?.hue, 'title': authorName })
      .text(authorAvatarProps?.emoji ?? authorName?.slice(0, 1) ?? '?').root;
  }
}

/** Relative time, as the tile heading shows it. */
const formatTime = (timestamp?: string): string => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true });
};

//
// Decorations
//

/**
 * Chrome for each chunk, built from the model's ranges rather than from the document.
 *
 * The model already knows where every message starts and ends, so nothing here parses the text or
 * needs markup planted in it — which is what lets a message body stay plain markdown: it wraps, it
 * is selectable across messages, and find matches it without stepping through tags.
 */
const buildDecorations = (state: EditorState, options: MessageDocumentOptions): DecorationSet => {
  const {
    model,
    getMetadata,
    getReactions,
    getQuote,
    getThreadSummary,
    onReact,
    onThreadOpen,
    onEditCommit,
    onEditCancel,
    themeMode,
    labels,
  } = options;
  const { editingId, currentId } = state.field(messageDocumentState);
  const builder = new RangeSetBuilder<Decoration>();
  const { doc } = state;
  const ranges = model.getRanges();
  for (const [index, item] of model.chunks.entries()) {
    const range = ranges[index];
    if (!range || range.from > doc.length) {
      continue;
    }

    if (item.kind === 'divider') {
      // A divider renders to no text at all, so it costs no line: the widget sits at the head of
      // the message that follows, ahead of that message's own heading widget.
      builder.add(
        range.from,
        range.from,
        Decoration.widget({ widget: new DividerWidget(item.label), block: true, side: -2 }),
      );
      continue;
    }

    if (item.head) {
      const metadata = getMetadata(item.message);
      builder.add(
        range.from,
        range.from,
        Decoration.widget({
          widget: new HeadingWidget(metadata.authorName ?? 'Anonymous', formatTime(metadata.timestamp)),
          block: true,
          side: -1,
        }),
      );
    }

    const first = doc.lineAt(Math.min(range.from, doc.length));
    const last = doc.lineAt(Math.min(Math.max(range.to - 1, range.from), doc.length));

    if (editingId === item.message.id) {
      // Replaces the body's lines rather than sitting beside them, so the text is not shown twice.
      // Emitted before this message's other chrome because the builder takes ranges in order and
      // this one starts back at the first line, which the per-line decorations have moved past.
      builder.add(
        first.from,
        last.to,
        Decoration.replace({
          widget: new EditWidget(
            item.message.id,
            doc.sliceString(first.from, last.to),
            themeMode,
            (text) => onEditCommit?.(item.message, text),
            () => onEditCancel?.(item.message),
          ),
          block: true,
        }),
      );
      continue;
    }

    const quote = getQuote?.(item.message);
    if (quote) {
      builder.add(range.from, range.from, Decoration.widget({ widget: new QuoteWidget(quote), block: true, side: 0 }));
    }

    // Every line of a message carries its identity, which is how a text surface keeps what a tile
    // got from being its own element: a test can target one message, and the current one is marked
    // for assistive technology rather than only tinted.
    const current = currentId === item.message.id;
    for (let line = first.number; line <= last.number; line++) {
      const { from } = doc.line(line);
      builder.add(
        from,
        from,
        Decoration.line({
          class: current ? 'cm-message-row bg-activeSurface' : 'cm-message-row',
          attributes: {
            'data-testid': 'thread.document.message',
            'data-message-id': item.message.id,
            ...(current ? { 'aria-current': 'location' } : {}),
          },
        }),
      );
    }

    // Anchored to the end of the message's last line: `range.to` is the first position of the
    // *next* chunk, which would hang a widget under the following message.
    const end = Math.min(Math.max(range.to - 1, range.from), doc.length);

    const reactions = getReactions?.(item.message) ?? [];
    if (reactions.length > 0) {
      builder.add(
        end,
        end,
        Decoration.widget({
          widget: new ReactionsWidget(reactions, (emoji) => onReact?.(item.message, emoji)),
          block: true,
          side: 1,
        }),
      );
    }

    const summary = getThreadSummary?.(item.message);
    if (summary) {
      const label =
        summary.replyCount > 0
          ? (labels?.replyCount(summary.replyCount) ?? `${summary.replyCount}`)
          : (labels?.startThread ?? 'Start a thread');
      builder.add(
        end,
        end,
        Decoration.widget({
          widget: new ThreadLinkWidget(summary, label, () => onThreadOpen?.(item.message)),
          block: true,
          side: 2,
        }),
      );
    }
  }

  return builder.finish();
};

const decorations = (options: MessageDocumentOptions): Extension =>
  StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state, options),
    update: (value, transaction) => {
      if (!transaction.docChanged && !transaction.effects.some((effect) => effect.is(messageDocumentChangedEffect))) {
        return value.map(transaction.changes);
      }

      // Rebuilt rather than mapped: an edit to one message moves the range of every message after
      // it, and the widgets carry content that the edit may have changed.
      return buildDecorations(transaction.state, options);
    },
    provide: (field) => EditorView.decorations.from(field),
  });

/** Avatars beside the first message of each run. */
const avatarGutter = ({ model, getMetadata }: MessageDocumentOptions): Extension =>
  gutter({
    class: 'cm-avatar-gutter',
    lineMarkerChange: (update) =>
      update.docChanged ||
      update.viewportChanged ||
      update.transactions.some((transaction) =>
        transaction.effects.some((effect) => effect.is(messageDocumentChangedEffect)),
      ),
    markers: (view) => {
      const builder = new RangeSetBuilder<GutterMarker>();
      for (const { from, to } of view.visibleRanges) {
        let line = view.state.doc.lineAt(from);
        while (line.from <= to) {
          const item = model.getChunkStartingAt(line.from);
          if (item?.kind === 'message' && item.head) {
            builder.add(line.from, line.from, new AvatarMarker(getMetadata(item.message)));
          }
          if (line.to + 1 > view.state.doc.length) {
            break;
          }
          line = view.state.doc.lineAt(line.to + 1);
        }
      }

      return builder.finish();
    },
  });

//
// Hover controls
//

const ACTION_ICONS: Record<MessageAction, string> = {
  react: 'ph--smiley--regular',
  reply: 'ph--arrow-bend-up-left--regular',
  thread: 'ph--chats-circle--regular',
  edit: 'ph--pencil-simple--regular',
  delete: 'ph--trash--regular',
};

const createToolbar = (
  actions: MessageAction[],
  message: MessageLike,
  onAction?: (action: MessageAction, message: MessageLike) => void,
): HTMLElement => {
  const row = Domino.of('div').classNames('flex gap-1 p-1 dx-panel bg-base-surface');
  for (const action of actions) {
    row.append(
      Domino.of('div')
        .classNames('dx-button aspect-square')
        .attributes({
          'role': 'button',
          'data-density': 'sm',
          'data-testid': `thread.document.${action}`,
          'title': action,
        })
        .append(Domino.svg(ACTION_ICONS[action]))
        .on('click', () => onAction?.(action, message)),
    );
  }

  return row.root;
};

/**
 * Hover controls for the message under the pointer.
 *
 * A tooltip rather than an inline decoration so the toolbar overlays the message instead of taking
 * a column: the row keeps the full width of the transcript, and a long message wraps across all of
 * it rather than into the space the controls would otherwise have reserved.
 */
const hoverControls = (options: MessageDocumentOptions): Extension => {
  const { model, getActions, onAction } = options;
  return hoverTooltip(
    (view, pos) => {
      const index = model.chunks.findIndex((chunk) => chunk === model.getChunkAt(pos));
      const item = model.chunks[index];
      if (item?.kind !== 'message') {
        return null;
      }

      const actions = getActions?.(item) ?? [];
      if (actions.length === 0) {
        return null;
      }

      return {
        pos: model.getRanges()[index].from,
        above: true,
        create: () => ({ dom: createToolbar(actions, item.message, onAction) }),
      };
    },
    { hoverTime: 75 },
  );
};

/**
 * Selecting a message is how a host reveals what it refers to, so the whole row is the target —
 * as it is in the tile stack, where the click sits on the tile rather than on a control.
 */
const selection = ({ model, onSelect }: MessageDocumentOptions): Extension =>
  EditorView.domEventHandlers({
    mousedown: (event, view) => {
      if (!onSelect) {
        return false;
      }
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      const item = pos === null ? undefined : model.getChunkAt(pos);
      if (item?.kind === 'message') {
        onSelect(item.message);
      }

      // Not handled: the click still places the caret, so selecting text keeps working.
      return false;
    },
  });

/** Everything the transcript draws over its document. */
export const messageDocumentChrome = (options: MessageDocumentOptions): Extension => [
  messageDocumentState,
  decorations(options),
  avatarGutter(options),
  hoverControls(options),
  selection(options),
  EditorView.theme({
    '.cm-avatar-gutter': { width: '2.5rem', paddingLeft: '0.5rem' },
    '.cm-gutters': { backgroundColor: 'var(--color-base-surface)', border: 'none' },
  }),
];
