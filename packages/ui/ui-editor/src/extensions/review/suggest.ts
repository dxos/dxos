//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSet, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type GutterMarker,
  type Tooltip,
  WidgetType,
  hoverTooltip,
} from '@codemirror/view';

import { Domino } from '@dxos/ui';

import { ChangeBarMarker, changeBars } from './change-bar';
import {
  type DiffHunk,
  type GroupPolicy,
  type Hunk,
  computeCharHunks,
  diffHunks,
  groupHunks,
  rebaseHunksWith,
} from './diff';

/** One author's proposed revision of the editor's document (the base). */
export type SuggestionSource = {
  /** Stable author identity (e.g. an identity DID); distinguishes overlapping suggestions. */
  author: string;
  /** Author colour, supplied by the caller to match the collaboration awareness cursor palette. */
  colour: string;
  /** The author's full proposed content, diffed against the base (or the editor's document if no base). */
  content: string;
  /**
   * The text this proposal was authored against (its branch's fork anchor). Diffing against it rather
   * than the live document keeps the diff to what THIS author changed — otherwise text the reader has
   * typed since the fork, which the proposal cannot contain, reads as the author deleting it.
   * Falls back to {@link SuggestionsOptions.base}, then the editor's document.
   */
  base?: string;
};

export type SuggestionsOptions = {
  /** The proposals to overlay; each is diffed against the editor's document. */
  sources: SuggestionSource[];
  /**
   * The accepted base (`main`) each source is diffed against. When given, a source is diffed
   * `base` vs `source.content` and its hunks are rebased into the editor document's coordinates (see
   * {@link rebaseHunks}) — so a foreign author's proposal decorates the right span even after the user's
   * own branch (the editor document) has diverged from `base`. Omit to diff each source directly against
   * the editor document (the standalone single-branch behaviour).
   */
  base?: string;
  /**
   * Optional grouping policy: coalesce an author's adjacent hunks into one reviewable unit (see
   * {@link groupHunks}). Omit to render one control per raw hunk.
   */
  group?: GroupPolicy;
  /**
   * Invoked when a change is accepted. When provided, the container owns the mutation (routing the
   * accept through a durable operation that merges the hunk to the parent), so the extension does NOT
   * splice locally — it only dismisses the widget. Absent ⇒ the extension splices the source's text
   * into the document directly (standalone use).
   */
  onAccept?: (hunk: DiffHunk, author: string) => void;
  /**
   * Invoked when a change is rejected. Lets the container route the reject through a durable operation
   * (revert the hunk on the author's branch). The widget is dismissed either way.
   */
  onReject?: (hunk: DiffHunk, author: string) => void;
  /** Invoked when a change is clicked in the document, so the host can reveal it elsewhere. */
  onSelect?: (hunk: DiffHunk, author: string) => void;
};

/** A hunk tagged with the source it came from, so overlapping suggestions stay attributable. */
type TaggedHunk = DiffHunk & { author: string; colour: string };

/**
 * Position-independent key so a dismissal survives offset shifts from unrelated edits. Scoped by
 * author so dismissing one author's change never hides an identical change by another.
 */
export const suggestionKey = (hunk: DiffHunk, author: string): string => `${author} ${hunk.removed} ${hunk.inserted}`;

/** Adds a hunk to the dismissed (rejected, hidden) set without changing the document. */
const dismissEffect = StateEffect.define<string>();

type SuggestionState = {
  dismissed: ReadonlySet<string>;
  decorations: DecorationSet;
  /** The currently visible (non-dismissed) hunks in document coordinates, for the tooltip layer. */
  hunks: readonly TaggedHunk[];
  /** Per-changed-line gutter change-bar markers, tinted with the author colour. */
  changeBars: RangeSet<GutterMarker>;
};

/**
 * Google-Docs-style multi-author suggestion overlay: renders each change between the editor's
 * document (the base) and every {@link SuggestionSource} in place — the removed original struck
 * through, the proposed replacement shown beside it, tinted with the author's colour — with hover
 * Accept/Reject controls in the (non-clipped) tooltip layer. Overlapping suggestions from different
 * authors stack deterministically (by
 * offset, then author). Accept splices the source's version of that hunk into the document (merging
 * the change); Reject hides the suggestion without altering the document (a view-only dismissal for
 * the session).
 */
export const suggestions = ({ sources, base, group, onAccept, onReject, onSelect }: SuggestionsOptions): Extension => {
  const tagged = (state: EditorState): TaggedHunk[] => {
    const doc = state.doc.toString();
    // With an explicit base, diff each source against it and rebase the hunks into the (possibly
    // diverged) document; without one, diff directly against the document (the original behaviour).
    // The base↔doc char diff is the same for every source sharing a base, so compute each one once.
    const charHunksFor = new Map<string, Hunk[]>();
    const all: TaggedHunk[] = [];
    for (const source of sources) {
      const sourceBase = source.base ?? base;
      const anchor = sourceBase ?? doc;
      let charHunks: Hunk[] | undefined;
      if (sourceBase !== undefined) {
        charHunks = charHunksFor.get(sourceBase) ?? computeCharHunks(sourceBase, doc);
        charHunksFor.set(sourceBase, charHunks);
      }
      const raw = group
        ? groupHunks(diffHunks(anchor, source.content), anchor, group)
        : diffHunks(anchor, source.content);
      // Edits the document already carries relative to the SAME anchor have been accepted, so they are
      // no longer suggestions — matched by content, since accepting shifts every later offset.
      const applied = sourceBase === undefined ? undefined : new Set(diffHunks(sourceBase, doc).map(editKey));
      const pending = applied === undefined ? raw : raw.filter((hunk) => !applied.has(editKey(hunk)));
      const hunks = charHunks === undefined ? pending : rebaseHunksWith(charHunks, pending);
      for (const hunk of hunks) {
        all.push({ ...hunk, author: source.author, colour: source.colour });
      }
    }
    // Deterministic stack order: earlier offset first, then by author so identical offsets are stable.
    return all.sort(
      (a, b) => a.from - b.from || a.to - b.to || (a.author < b.author ? -1 : a.author > b.author ? 1 : 0),
    );
  };

  /**
   * Has this change already landed in the document? Diffing a proposal against the revision its author
   * wrote on keeps the diff to their edits, but it also keeps reporting them after they are accepted —
   * the branch still differs from its own fork anchor. A change whose proposed text is already present
   * (and whose replaced text is gone) has been applied, so it is no longer a suggestion.
   */
  const editKey = (hunk: DiffHunk): string => `${hunk.removed}\u241f${hunk.inserted}`;

  const build = (state: EditorState, dismissed: ReadonlySet<string>): SuggestionState => {
    const ranges = [];
    const visible: TaggedHunk[] = [];
    // First author to touch a line owns its gutter bar colour (hunks arrive sorted by offset, author).
    const lineColour = new Map<number, string>();
    for (const hunk of tagged(state)) {
      if (dismissed.has(suggestionKey(hunk, hunk.author))) {
        continue;
      }
      visible.push(hunk);
      if (hunk.to > hunk.from) {
        ranges.push(deleteMark.range(hunk.from, hunk.to));
      }
      // The inline preview of the proposed text; a pure deletion has none (the strikethrough carries it).
      if (hunk.inserted) {
        // `side: 1` keeps the preview adjacent to the text it follows. At the very end of the document
        // that would leave no caret position past the widget (a trailing suggestion makes the end of
        // the document unreachable), so anchor it before the final position instead.
        const side = hunk.to === state.doc.length ? -1 : 1;
        ranges.push(Decoration.widget({ widget: new SuggestionWidget(hunk), side }).range(hunk.to));
      }
      // A whitespace-only change (a proposed paragraph break) has no visible text on the line it
      // anchors to; barring that line marks prose the author never touched.
      if (hunk.removed.trim().length === 0 && hunk.inserted.trim().length === 0) {
        continue;
      }
      // Trim a trailing newline so a paragraph-break change does not tag the following (empty) line.
      let end = hunk.to;
      while (end > hunk.from && state.doc.sliceString(end - 1, end) === '\n') {
        end--;
      }
      for (let line = state.doc.lineAt(hunk.from).number; line <= state.doc.lineAt(end).number; line++) {
        const from = state.doc.line(line).from;
        if (!lineColour.has(from)) {
          lineColour.set(from, hunk.colour);
        }
      }
    }
    const changeBarSet = RangeSet.of(
      [...lineColour.entries()]
        .sort(([a], [b]) => a - b)
        .map(([from, colour]) => new ChangeBarMarker(colour).range(from)),
    );
    // `sort: true` orders the mixed mark/widget ranges (multiple sources interleave arbitrarily).
    return { dismissed, decorations: Decoration.set(ranges, true), hunks: visible, changeBars: changeBarSet };
  };

  const field = StateField.define<SuggestionState>({
    create: (state) => build(state, new Set()),
    update: (value, transaction) => {
      const dismissed = new Set(value.dismissed);
      let changed = false;
      for (const effect of transaction.effects) {
        if (effect.is(dismissEffect)) {
          dismissed.add(effect.value);
          changed = true;
        }
      }
      if (!transaction.docChanged && !changed) {
        return value;
      }
      return build(transaction.state, dismissed);
    },
    provide: (self) => EditorView.decorations.from(self, (value) => value.decorations),
  });

  return [
    field,
    selectHandler(field, onSelect),
    suggestTooltip(field, onAccept, onReject),
    changeBars((state) => state.field(field).changeBars),
    suggestTheme,
  ];
};

/**
 * Reports the change under a click, so the host can reveal it on its other surfaces (the review
 * companion accents the matching card). The click is not consumed — the caret still lands where the
 * reader put it.
 */
const selectHandler = (
  field: StateField<SuggestionState>,
  onSelect?: (hunk: DiffHunk, author: string) => void,
): Extension =>
  EditorView.domEventHandlers({
    mousedown: (event, view) => {
      if (!onSelect) {
        return false;
      }
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) {
        return false;
      }
      const hunk = view.state
        .field(field)
        .hunks.find((candidate) =>
          candidate.from === candidate.to ? pos === candidate.from : pos >= candidate.from && pos <= candidate.to,
        );
      if (hunk) {
        onSelect(hunk, hunk.author);
      }
      return false;
    },
  });

/**
 * Accept/reject controls in the CodeMirror tooltip layer (`.cm-tooltip`), which renders outside
 * `.cm-scroller` and so is never clipped by its overflow (the failure of the old inline
 * `position: absolute` popover). Hover-triggered per hunk: hovering a change's struck text or its
 * inline preview surfaces the controls for that hunk.
 */
const suggestTooltip = (
  field: StateField<SuggestionState>,
  onAccept?: (hunk: DiffHunk, author: string) => void,
  onReject?: (hunk: DiffHunk, author: string) => void,
): Extension => {
  // The controls are anchored to the hunk, not the pointer, and the same instance is returned for
  // every position within it — a fresh tooltip per pointer position makes them flicker and jump as the
  // pointer crosses the change.
  const tooltips = new Map<string, Tooltip>();
  return hoverTooltip(
    (view, pos): Tooltip | null => {
      // Match the hunk under the pointer: a range covers `[from, to]`; a pure insertion (from === to,
      // rendered as a widget) is matched at its single offset.
      const hunk = view.state
        .field(field)
        .hunks.find((candidate) =>
          candidate.from === candidate.to ? pos === candidate.from : pos >= candidate.from && pos <= candidate.to,
        );
      if (!hunk) {
        return null;
      }

      const key = `${suggestionKey(hunk, hunk.author)} ${hunk.from}:${hunk.to}`;
      const cached = tooltips.get(key);
      if (cached) {
        return cached;
      }

      // Only the hunk being hovered is worth keeping; the document moves on.
      tooltips.clear();
      const tooltip: Tooltip = {
        pos: hunk.from,
        end: hunk.to,
        above: true,
        create: () => ({ dom: createControls(view, hunk, onAccept, onReject) }),
      };
      tooltips.set(key, tooltip);
      return tooltip;
    },
    { hoverTime: 75 },
  );
};

/** Builds the accept/reject control row for a hunk; shared by the tooltip layer. */
const createControls = (
  view: EditorView,
  hunk: TaggedHunk,
  onAccept?: (hunk: DiffHunk, author: string) => void,
  onReject?: (hunk: DiffHunk, author: string) => void,
): HTMLElement =>
  Domino.of('div')
    .classNames('cm-suggest-controls')
    .append(
      // Each control is a `dx-button` div wrapping a Phosphor icon.
      Domino.of('div')
        .classNames('dx-button aspect-square cm-suggest-accept')
        .attributes({ 'role': 'button', 'data-density': 'sm', 'title': 'Accept change' })
        .append(Domino.svg('ph--check--regular'))
        .on('mousedown', (event) => {
          event.preventDefault();
          if (onAccept) {
            // The container owns the mutation (durable cherry-pick op); the op's edit flows back and
            // re-diffs the hunk away. Dismiss for immediate feedback — do not splice locally (that
            // would double-apply the change onto the parent).
            view.dispatch({ effects: dismissEffect.of(suggestionKey(hunk, hunk.author)) });
            onAccept(hunk, hunk.author);
          } else {
            view.dispatch({ changes: { from: hunk.from, to: hunk.to, insert: hunk.inserted } });
          }
        }),
      Domino.of('div')
        .classNames('dx-button aspect-square cm-suggest-reject')
        .attributes({ 'role': 'button', 'data-density': 'sm', 'title': 'Reject change' })
        .append(Domino.svg('ph--x--regular'))
        .on('mousedown', (event) => {
          event.preventDefault();
          view.dispatch({ effects: dismissEffect.of(suggestionKey(hunk, hunk.author)) });
          onReject?.(hunk, hunk.author);
        }),
    ).root;

export type SuggestChangesOptions = {
  /** The proposal (e.g. a branch's content) whose changes are suggested over the editor's document. */
  proposal: string;
  /**
   * Author colour for the inline markers — pass the branch author's palette colour (e.g.
   * `var(--color-<hue>-text)`) so the suggestion reads with the author's consistent colour. Defaults
   * to the success colour for a standalone (author-agnostic) review.
   */
  colour?: string;
  onAccept?: (hunk: DiffHunk) => void;
  onReject?: (hunk: DiffHunk) => void;
};

/**
 * Single-source suggestion overlay — the common case of one proposal (e.g. a branch) reviewed against
 * the editor's document. A thin wrapper over {@link suggestions}.
 */
export const suggestChanges = ({
  proposal,
  colour = 'var(--color-success-text)',
  onAccept,
  onReject,
}: SuggestChangesOptions): Extension =>
  suggestions({
    sources: [{ author: '', colour, content: proposal }],
    onAccept: onAccept && ((hunk) => onAccept(hunk)),
    onReject: onReject && ((hunk) => onReject(hunk)),
  });

/** The replaced original as a plain strikethrough; attribution is carried by the coloured insert. */
const deleteMark = Decoration.mark({ class: 'cm-suggest-delete' });

/** Inline preview of a change's proposed text; the accept/reject controls live in the tooltip layer. */
class SuggestionWidget extends WidgetType {
  #hunk: TaggedHunk;

  constructor(hunk: TaggedHunk) {
    super();
    this.#hunk = hunk;
  }

  override eq(other: SuggestionWidget): boolean {
    // The preview only renders the proposed text in the author's colour, so equality is content-only;
    // author distinguishes overlapping suggestions with the same text.
    return (
      other.#hunk.inserted === this.#hunk.inserted &&
      other.#hunk.colour === this.#hunk.colour &&
      other.#hunk.author === this.#hunk.author
    );
  }

  override toDOM(): HTMLElement {
    return Domino.of('span')
      .classNames('cm-suggest-actions')
      .append(
        Domino.of('span')
          .classNames('cm-suggest-insert')
          // The author's colour carries attribution: coloured text underlined in the same colour.
          .style({ color: this.#hunk.colour, borderBottomColor: this.#hunk.colour })
          .text(this.#hunk.inserted),
      ).root;
  }

  // Pointer events must reach the editor: ignoring them left the preview inert, so hovering it never
  // opened the accept/reject tooltip and clicking at or past a trailing preview never moved the caret.
  // Everything else (input, composition) stays ignored — the preview is not editable text.
  override ignoreEvent(event: Event): boolean {
    return !(event instanceof MouseEvent || event instanceof PointerEvent);
  }
}

const suggestTheme = EditorView.baseTheme({
  // The replaced original: a plain, de-emphasised strikethrough — no fill, so overlapping deletions
  // from multiple authors on the same span don't stack into a coloured mess.
  '& .cm-suggest-delete': {
    textDecoration: 'line-through',
    textDecorationColor: 'var(--color-separator)',
    opacity: 0.6,
  },
  // The proposed text: shown in the author's colour and underlined in it (both set inline per hunk),
  // so attribution reads from colour rather than a uniform green fill.
  '& .cm-suggest-insert': {
    borderBottom: '2px solid transparent',
  },
  '& .cm-suggest-actions': {
    marginInlineStart: '2px',
  },
  // Accept/reject render in the CodeMirror tooltip layer (a `.cm-tooltip` sibling of `.cm-scroller`),
  // so the controls are never clipped by the scroller's overflow.
  '& .cm-suggest-controls': {
    display: 'flex',
    gap: '2px',
    padding: '2px',
    borderRadius: '4px',
    background: 'var(--color-modal-surface)',
    border: '1px solid var(--color-separator)',
    boxShadow: '0 2px 6px color-mix(in srgb, black 25%, transparent)',
    whiteSpace: 'nowrap',
  },
  // Compact popover buttons sized to the text.
  '& .cm-suggest-accept, & .cm-suggest-reject': {
    blockSize: '1.3em',
    inlineSize: '1.3em',
    minBlockSize: '0',
  },
  '& .cm-suggest-accept': {
    color: 'var(--color-success-text)',
  },
  '& .cm-suggest-reject': {
    color: 'var(--color-error-text)',
  },
});
