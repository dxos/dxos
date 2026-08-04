//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  WidgetType,
  gutter,
  hoverTooltip,
} from '@codemirror/view';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

import { Domino } from '@dxos/ui';

import { type ChunkModel } from '../model';
import { type MessageLike, type MessageMetadata, type MessageReaction } from '../types';
import { type MessageItem, type TranscriptItem } from './transcript-items';

/** Dispatched after the model syncs, so decorations rebuild against ranges the document now matches. */
export const transcriptChangedEffect = StateEffect.define<null>();

export type TranscriptAction = 'react' | 'reply' | 'thread' | 'edit' | 'delete';

export type TranscriptExtensionOptions = {
  model: ChunkModel<TranscriptItem>;
  getMetadata: (message: MessageLike) => MessageMetadata;
  getReactions?: (message: MessageLike) => MessageReaction[];
  /** Actions the hover toolbar offers for a message; an empty result hides it. */
  getActions?: (item: MessageItem) => TranscriptAction[];
  onAction?: (action: TranscriptAction, message: MessageLike) => void;
  onReact?: (message: MessageLike, emoji: string) => void;
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
          .attributes({ 'type': 'button', 'aria-pressed': self ? 'true' : 'false', 'data-testid': 'transcript.pill' })
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
const buildDecorations = (state: EditorState, options: TranscriptExtensionOptions): DecorationSet => {
  const { model, getMetadata, getReactions, onReact } = options;
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

    const reactions = getReactions?.(item.message) ?? [];
    if (reactions.length > 0) {
      // Anchored to the end of the message's last line: `range.to` is the first position of the
      // *next* chunk, which would hang the pills under the following message.
      const end = Math.min(Math.max(range.to - 1, range.from), doc.length);
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
  }

  return builder.finish();
};

const decorations = (options: TranscriptExtensionOptions): Extension =>
  StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state, options),
    update: (value, transaction) => {
      if (!transaction.docChanged && !transaction.effects.some((effect) => effect.is(transcriptChangedEffect))) {
        return value.map(transaction.changes);
      }

      // Rebuilt rather than mapped: an edit to one message moves the range of every message after
      // it, and the widgets carry content that the edit may have changed.
      return buildDecorations(transaction.state, options);
    },
    provide: (field) => EditorView.decorations.from(field),
  });

/** Avatars beside the first message of each run. */
const avatarGutter = ({ model, getMetadata }: TranscriptExtensionOptions): Extension =>
  gutter({
    class: 'cm-avatar-gutter',
    lineMarkerChange: (update) =>
      update.docChanged ||
      update.viewportChanged ||
      update.transactions.some((transaction) =>
        transaction.effects.some((effect) => effect.is(transcriptChangedEffect)),
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

const ACTION_ICONS: Record<TranscriptAction, string> = {
  react: 'ph--smiley--regular',
  reply: 'ph--arrow-bend-up-left--regular',
  thread: 'ph--chats-circle--regular',
  edit: 'ph--pencil-simple--regular',
  delete: 'ph--trash--regular',
};

const createToolbar = (
  actions: TranscriptAction[],
  message: MessageLike,
  onAction?: (action: TranscriptAction, message: MessageLike) => void,
): HTMLElement => {
  const row = Domino.of('div').classNames('flex gap-1 p-1 dx-panel bg-base-surface');
  for (const action of actions) {
    row.append(
      Domino.of('div')
        .classNames('dx-button aspect-square')
        .attributes({ 'role': 'button', 'data-density': 'sm', 'data-testid': `transcript.${action}`, 'title': action })
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
const hoverControls = (options: TranscriptExtensionOptions): Extension => {
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

/** Everything the transcript draws over its document. */
export const transcriptChrome = (options: TranscriptExtensionOptions): Extension => [
  decorations(options),
  avatarGutter(options),
  hoverControls(options),
  EditorView.theme({
    '.cm-avatar-gutter': { width: '2.5rem', paddingLeft: '0.5rem' },
    '.cm-gutters': { backgroundColor: 'var(--color-base-surface)', border: 'none' },
  }),
];
