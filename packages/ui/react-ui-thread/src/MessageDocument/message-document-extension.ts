//
// Copyright 2026 DXOS.org
//

import {
  EditorState,
  type Extension,
  Prec,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType, keymap } from '@codemirror/view';

import { Domino } from '@dxos/ui';
import { mx } from '@dxos/ui-theme';

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
export type MessageDocumentState = { editingId?: string; currentId?: string; hoveredId?: string };

export const setMessageDocumentStateEffect = StateEffect.define<MessageDocumentState>();

/** Commit the edit in progress from outside the document — the toolbar's ✓, which is not a keystroke. */
export const commitMessageEditEffect = StateEffect.define<null>();

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
  /** Every keystroke inside the edited message, so the host can hold the draft in memory. */
  onDraftChange?: (message: MessageLike, text: string) => void;
  /** The message under the pointer, for the host's floating toolbar. */
  onHoverChange?: (hover: MessageHover | undefined) => void;
  /** A widget whose content the host renders as React. */
  onPortalMount?: (portal: MessagePortal) => void;
  onPortalUnmount?: (id: string, root: HTMLElement) => void;
  /** Copy for the thread row, so this package does not reach for a translation namespace mid-render. */
  labels?: { startThread: () => string; replyCount: (count: number) => string; editing: () => string };
};

//
// Widgets
//

/** A DOM anchor the host renders React into, so a widget can be a real component. */
export type MessagePortalKind = 'head' | 'reactions' | 'quote' | 'thread';

export type MessagePortal = {
  id: string;
  root: HTMLElement;
  kind: MessagePortalKind;
  message: MessageLike;
  continues: boolean;
};

/**
 * Widget whose content is rendered by the host as React.
 *
 * The row frame has to *be* the tile stack's `Avatar` and heading rather than a DOM approximation of
 * them — same component, same rail size, same alignment — so it is portaled in rather than built here.
 */
class PortalWidget extends WidgetType {
  constructor(
    private readonly _id: string,
    private readonly _kind: MessagePortalKind,
    private readonly _message: MessageLike,
    private readonly _continues: boolean,
    private readonly _revision: string,
    private readonly _notify: PortalNotifier,
  ) {
    super();
  }

  override eq(other: this) {
    return this._id === other._id && this._revision === other._revision && this._continues === other._continues;
  }

  #root?: HTMLElement;

  override toDOM() {
    const root = document.createElement('div');
    this.#root = root;
    // The rail indent, so chrome lines up with the text column — except the head, which renders
    // `Message.Root` and so brings the rail column with it; indenting that would double it.
    root.className = this._kind === 'head' ? 'cm-message-part' : 'cm-message-part cm-message-chrome';
    this._notify.mounted({
      id: this._id,
      root,
      kind: this._kind,
      message: this._message,
      continues: this._continues,
    });
    return root;
  }

  override destroy() {
    // The root is passed back so the host can tell a genuine unmount from the teardown of a widget
    // that has already been replaced: ids are stable, so a late `destroy` would otherwise remove
    // the entry its own replacement just added.
    this._notify.unmounted(this._id, this.#root!);
  }

  override ignoreEvent() {
    return false;
  }
}

type PortalNotifier = { mounted: (portal: MessagePortal) => void; unmounted: (id: string, root: HTMLElement) => void };

class DividerWidget extends WidgetType {
  constructor(private readonly _label?: string) {
    super();
  }

  override eq(other: this) {
    return this._label === other._label;
  }

  override toDOM() {
    const rule = () => Domino.of('div').classNames('grow h-px bg-separator');
    return this._label
      ? Domino.of('div')
          .classNames('flex items-center gap-2 px-2 py-2 text-xs text-description')
          .append(rule(), Domino.of('span').classNames('shrink-0').text(this._label), rule()).root
      : Domino.of('div').classNames('px-2 py-2').append(rule()).root;
  }
}

/** Keyboard affordances beneath a message being edited. */
class EditHintWidget extends WidgetType {
  constructor(private readonly _text: string) {
    super();
  }

  override eq(other: this) {
    return this._text === other._text;
  }

  override toDOM() {
    return Domino.of('div').classNames('cm-message-chrome pt-1 text-xs text-description').text(this._text).root;
  }
}

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
const buildDecorations = (
  state: EditorState,
  options: MessageDocumentOptions,
  portals: PortalNotifier,
): DecorationSet => {
  const { model, getReactions, getQuote, getThreadSummary, labels } = options;
  const { editingId, currentId, hoveredId } = state.field(messageDocumentState);
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
      builder.add(
        range.from,
        range.from,
        Decoration.widget({
          widget: new PortalWidget(`head:${item.message.id}`, 'head', item.message, !item.last, '', portals),
          block: true,
          side: -1,
        }),
      );
    }

    const first = doc.lineAt(Math.min(range.from, doc.length));
    const last = doc.lineAt(Math.min(Math.max(range.to - 1, range.from), doc.length));

    const editing = editingId === item.message.id;

    if (getQuote?.(item.message)) {
      builder.add(
        range.from,
        range.from,
        Decoration.widget({
          widget: new PortalWidget(`quote:${item.message.id}`, 'quote', item.message, false, '', portals),
          block: true,
          side: 0,
        }),
      );
    }

    // Every line of a message carries its identity, which is how a text surface keeps what a tile
    // got from being its own element: a test can target one message, and the current one is marked
    // for assistive technology rather than only tinted.
    const current = currentId === item.message.id;
    // The hovered row is tinted for its whole height, the way Discord marks what the toolbar acts
    // on — otherwise a floating toolbar leaves the target ambiguous in a dense transcript.
    const hovered = hoveredId === item.message.id;
    for (let line = first.number; line <= last.number; line++) {
      const { from } = doc.line(line);
      builder.add(
        from,
        from,
        Decoration.line({
          class: mx(
            'cm-message-row',
            current && 'bg-active-surface',
            hovered && !current && !editing && 'bg-hover-surface',
            // First and last carry the box's rounded ends, so a message spanning several lines
            // reads as one input rather than a stack of them.
            editing && 'cm-message-row--editing',
            editing && line === first.number && 'cm-message-row--editing-first',
            editing && line === last.number && 'cm-message-row--editing-last',
          ),
          attributes: {
            'data-testid': 'thread.document.message',
            'data-message-id': item.message.id,
            ...(current ? { 'aria-current': 'location' } : {}),
            ...(editing ? { 'data-editing': 'true' } : {}),
          },
        }),
      );
    }

    // Anchored to the end of the message's last line: `range.to` is the first position of the
    // *next* chunk, which would hang a widget under the following message.
    const end = Math.min(Math.max(range.to - 1, range.from), doc.length);

    if (editing) {
      // What the keys do, under the box — the affordance that says the row is an input.
      builder.add(
        end,
        end,
        Decoration.widget({ widget: new EditHintWidget(labels?.editing() ?? ''), block: true, side: 1 }),
      );
      continue;
    }

    const reactions = getReactions?.(item.message) ?? [];
    if (reactions.length > 0) {
      builder.add(
        end,
        end,
        Decoration.widget({
          widget: new PortalWidget(
            `reactions:${item.message.id}`,
            'reactions',
            item.message,
            false,
            reactions.map((reaction) => `${reaction.emoji}:${reaction.count}:${reaction.self}`).join(','),
            portals,
          ),
          block: true,
          side: 1,
        }),
      );
    }

    const summary = getThreadSummary?.(item.message);
    if (summary) {
      builder.add(
        end,
        end,
        Decoration.widget({
          widget: new PortalWidget(
            `thread:${item.message.id}`,
            'thread',
            item.message,
            false,
            `${summary.name ?? ''}:${summary.replyCount}:${summary.lastActivity ?? ''}`,
            portals,
          ),
          block: true,
          side: 2,
        }),
      );
    }
  }

  return builder.finish();
};

const decorations = (options: MessageDocumentOptions, portals: PortalNotifier): Extension =>
  StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state, options, portals),
    update: (value, transaction) => {
      // Rebuilt on the model's own writes and when the host says the chrome moved — but NOT on a
      // user edit, whose keystrokes run ahead of the model: rebuilding against ranges that no
      // longer describe the document walks positions backwards, which the range builder rejects
      // outright. Mapping is exactly right for that case, since every decoration shifts with a
      // change it did not cause.
      //
      // The model's write must be in this set. The host dispatches the effect before the write
      // lands (the model syncs in a microtask), so at effect time the ranges still point past the
      // end of an empty document and every chunk is skipped — which left the transcript with no
      // headings, reactions, quotes or thread rows at all.
      const modelWrite = transaction.docChanged && !isUserEdit(transaction);
      const hostSignal = transaction.effects.some((effect) => effect.is(messageDocumentChangedEffect));
      if (!modelWrite && !hostSignal) {
        return value.map(transaction.changes);
      }

      return buildDecorations(transaction.state, options, portals);
    },
    provide: (field) => EditorView.decorations.from(field),
  });

//
// Hover reporting
//

/** Where the toolbar for a hovered message should sit, in coordinates local to the editor. */
export type MessageHover = { message: MessageLike; top: number };

/**
 * Reports which message the pointer is over, so the host can float a toolbar there.
 *
 * The controls are built in React from `@dxos/react-ui-menu` like every other toolbar in the app,
 * rather than as hand-rolled DOM inside a CodeMirror tooltip — the actions belong in the action
 * graph, and a tooltip anchors to a text position, which puts the toolbar wherever the anchor
 * happens to land rather than over the row it acts on.
 */
const hoverReporting = ({ model, onHoverChange }: MessageDocumentOptions): Extension => {
  if (!onHoverChange) {
    return [];
  }

  return EditorView.domEventHandlers({
    mousemove: (event, view) => {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      const item = pos === null ? undefined : model.getChunkAt(pos);
      if (item?.kind !== 'message') {
        onHoverChange(undefined);
        return false;
      }

      const index = model.chunks.indexOf(item);
      const range = model.getRanges()[index];
      const coords = range && view.coordsAtPos(range.from);
      if (!coords) {
        return false;
      }

      // Local to the editor's own box, so the overlay can be positioned without measuring twice.
      onHoverChange({ message: item.message, top: coords.top - view.dom.getBoundingClientRect().top });
      return false;
    },
  });
};

//
// Editing
//

/** Line range of the message being edited, excluding the newline that separates it from the next. */
const editRange = (
  state: EditorState,
  model: ChunkModel<MessageDocumentItem>,
): { from: number; to: number } | undefined => {
  const { editingId } = state.field(messageDocumentState);
  if (!editingId) {
    return undefined;
  }

  const index = model.chunks.findIndex((chunk) => chunk.kind === 'message' && chunk.message.id === editingId);
  const range = index === -1 ? undefined : model.getRanges()[index];
  if (!range) {
    return undefined;
  }

  const { doc } = state;
  const first = doc.lineAt(Math.min(range.from, doc.length));
  const last = doc.lineAt(Math.min(Math.max(range.to - 1, range.from), doc.length));
  return { from: first.from, to: last.to };
};

const isUserEdit = (transaction: Transaction): boolean =>
  transaction.isUserEvent('input') ||
  transaction.isUserEvent('delete') ||
  transaction.isUserEvent('move') ||
  transaction.isUserEvent('undo') ||
  transaction.isUserEvent('redo');

/**
 * One message editable in place, in the transcript's own document — no nested editor, so the text
 * keeps the transcript's markdown rendering, wrapping and metrics rather than approximating them.
 *
 * The draft lives in memory and reaches the message only on submit: while editing, the edited
 * chunk renders the draft rather than the stored text, so an incoming revision of that message
 * cannot overwrite what is being typed. Everything else keeps syncing — nothing about protecting a
 * draft requires freezing the rest of the channel.
 *
 * `EditorState.readOnly` is deliberately NOT used: it drops user edits wholesale (see
 * `createBasicExtensions`), which is the opposite of a document that is writable in one span.
 */
const editing = (options: MessageDocumentOptions): Extension => {
  const { model, onEditCommit, onEditCancel, onDraftChange } = options;

  const messageBeingEdited = (state: EditorState): MessageLike | undefined => {
    const { editingId } = state.field(messageDocumentState);
    const chunk = model.chunks.find((chunk) => chunk.kind === 'message' && chunk.message.id === editingId);
    return chunk?.kind === 'message' ? chunk.message : undefined;
  };

  /** Reports whether there was an edit to commit, which is also what the Enter binding answers. */
  const commit = (state: EditorState): boolean => {
    const range = editRange(state, model);
    const message = messageBeingEdited(state);
    if (!range || !message) {
      return false;
    }

    onEditCommit?.(message, state.doc.sliceString(range.from, range.to));
    return true;
  };

  return [
    // Contenteditable only while a message is being edited, so a chat log carries no stray caret.
    EditorView.editable.compute([messageDocumentState], (state) => !!state.field(messageDocumentState).editingId),

    // A transaction filter rather than `changeFilter`, whose suppressed ranges are half-open at the
    // boundary: protecting `[to, length]` rejects an insertion *at* `to`, which is appending to the
    // end of the message — the most ordinary edit there is. Judging the whole transaction against
    // the row instead admits insertions at either end and still rejects a delete that would eat
    // the separator and merge two messages.
    EditorState.transactionFilter.of((transaction) => {
      if (!transaction.docChanged || !isUserEdit(transaction)) {
        // Model writes are how the transcript is populated at all, so they always pass.
        return transaction;
      }

      const range = editRange(transaction.startState, model);
      if (!range) {
        return [];
      }

      let within = true;
      transaction.changes.iterChangedRanges((fromA, toA) => {
        if (fromA < range.from || toA > range.to) {
          within = false;
        }
      });

      return within ? transaction : [];
    }),

    // The toolbar's ✓ is not a keystroke, so it commits through an effect rather than by reaching
    // into the document itself — the row's bounds are the extension's to know.
    EditorView.updateListener.of((update) => {
      const asked = update.transactions.some((transaction) =>
        transaction.effects.some((effect) => effect.is(commitMessageEditEffect)),
      );
      if (asked) {
        commit(update.view.state);
      }
    }),

    Prec.highest(
      keymap.of([
        {
          key: 'Enter',
          run: (view) => commit(view.state),
        },
        {
          key: 'Escape',
          run: (view) => {
            const message = messageBeingEdited(view.state);
            if (!message) {
              return false;
            }

            onEditCancel?.(message);
            return true;
          },
        },
      ]),
    ),

    // Entering edit mode has to put the caret in the message: the user reached it from a toolbar
    // button, not by clicking into the text, so nothing else would give them somewhere to type.
    EditorView.updateListener.of((update) => {
      const entered = update.transactions.some((transaction) =>
        transaction.effects.some(
          (effect) =>
            effect.is(setMessageDocumentStateEffect) &&
            effect.value.editingId &&
            effect.value.editingId !== transaction.startState.field(messageDocumentState).editingId,
        ),
      );
      if (entered) {
        const range = editRange(update.state, model);
        if (range) {
          // Deferred: a dispatch cannot happen inside the update it is reacting to.
          queueMicrotask(() => {
            update.view.focus();
            update.view.dispatch({ selection: { anchor: range.to } });
          });
        }
      }
    }),

    EditorView.updateListener.of((update) => {
      if (!update.docChanged || !update.transactions.some(isUserEdit)) {
        return;
      }

      const range = editRange(update.state, model);
      const message = messageBeingEdited(update.state);
      if (!range || !message) {
        return;
      }

      // The model's diff baseline is the text it last wrote, so a keystroke it did not make leaves
      // it believing something false about the document. Rebasing first keeps the next sync from
      // re-applying the user's own edit on top of itself; re-setting the chunks with the draft then
      // moves the ranges back onto the document, which every decoration and the edit bounds read.
      const text = update.state.doc.sliceString(range.from, range.to);
      model.rebase(update.state.doc.toString());
      model.set(
        model.chunks.map((chunk) =>
          chunk.kind === 'message' && chunk.message.id === message.id ? { ...chunk, draft: text } : chunk,
        ),
      );
      onDraftChange?.(message, text);
    }),
  ];
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

const EDIT_BOX_PADDING = '0.5rem';
const EDIT_BOX_RADIUS = '0.25rem';

/** The box around an edited row, as shadows: a border would add to the line's metrics and move the text. */
const EDIT_BOX_EDGE = {
  start: 'inset 1px 0 0 var(--color-separator)',
  end: 'inset -1px 0 0 var(--color-separator)',
  top: 'inset 0 1px 0 var(--color-separator)',
  bottom: 'inset 0 -1px 0 var(--color-separator)',
};

/** Everything the transcript draws over its document. */
export const messageDocumentChrome = (options: MessageDocumentOptions): Extension => {
  const portals: PortalNotifier = {
    mounted: (portal) => options.onPortalMount?.(portal),
    unmounted: (id, root) => options.onPortalUnmount?.(id, root),
  };

  return [
    messageDocumentState,
    decorations(options, portals),
    editing(options),
    hoverReporting(options),
    selection(options),
    // Message text is indented past the avatar rail so it lines up under the heading, the way the
    // tile stack's second grid column does.
    EditorView.theme({
      '.cm-message-row': { paddingInlineStart: 'var(--dx-rail-size)' },
      // A formatting context, so the spacing the tile components carry as vertical margins (the
      // quote's `mb`, the reaction and thread rows' `mt`) is contained instead of collapsing
      // through: a collapsed margin sits outside every box, and an unpainted strip between them is
      // what makes one hovered message read as a stack of separate bands.
      '.cm-message-part': { display: 'flow-root' },
      '.cm-message-chrome': { paddingInlineStart: 'var(--dx-rail-size)' },
      // The edited row is boxed like an input, which is what says it is one — but nothing in the box
      // may move the text: it has to stay on the column every other message is on, so that becoming
      // editable is a change of appearance rather than of position. Hence the inline start pulled
      // back by exactly the padding it adds, and edges drawn as inset shadows, which take no space.
      '.cm-message-row--editing': {
        backgroundColor: 'var(--color-input-surface)',
        boxShadow: `${EDIT_BOX_EDGE.start}, ${EDIT_BOX_EDGE.end}`,
        marginInlineStart: `calc(var(--dx-rail-size) - ${EDIT_BOX_PADDING})`,
        paddingInline: EDIT_BOX_PADDING,
      },
      // First and last carry the box's rounded ends, so a message spanning several lines reads as one
      // input rather than a stack of them; a single-line message is both, and needs all four edges.
      '.cm-message-row--editing-first': {
        boxShadow: `${EDIT_BOX_EDGE.start}, ${EDIT_BOX_EDGE.end}, ${EDIT_BOX_EDGE.top}`,
        borderStartStartRadius: EDIT_BOX_RADIUS,
        borderStartEndRadius: EDIT_BOX_RADIUS,
      },
      '.cm-message-row--editing-last': {
        boxShadow: `${EDIT_BOX_EDGE.start}, ${EDIT_BOX_EDGE.end}, ${EDIT_BOX_EDGE.bottom}`,
        borderEndStartRadius: EDIT_BOX_RADIUS,
        borderEndEndRadius: EDIT_BOX_RADIUS,
      },
      '.cm-message-row--editing-first.cm-message-row--editing-last': {
        boxShadow: Object.values(EDIT_BOX_EDGE).join(', '),
      },
    }),
  ];
};
