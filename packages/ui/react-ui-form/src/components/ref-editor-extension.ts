//
// Copyright 2026 DXOS.org
//

import {
  EditorState,
  type Extension,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type TransactionSpec,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';
import { getHashHue, getStyles, mx } from '@dxos/ui-theme';

/**
 * Display info for a resolved object reference.
 */
export type RefInfo = {
  label: string;
  hue?: string;
};

/**
 * Content model:
 * - `'ref'`: whitespace-separated tokens; `@<id>` references to existing objects (and raw tokens
 *   accepted by the pluggable {@link RefEditorExtensionOptions.match} regexp).
 * - `'email'`: comma-separated RFC 5322 mailboxes (`Name <email>` or bare `email`); the comma
 *   separators are consumed into the atomic tags so they are not visible.
 */
export type RefEditorMode = 'ref' | 'email';

/** Matches an object reference token (`@<object id>`). */
export const REF_REGEX = /^@([A-Za-z0-9]+)$/;

/** Matches a well-formed email address token. */
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** Matches an RFC 5322 name-addr (`Name <email>`); group 1 = display name, group 2 = addr-spec. */
export const NAME_ADDR_REGEX = /^(.*?)\s*<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>$/;

/** Formats an RFC 5322 mailbox (`Name <email>`). */
export const formatMailbox = (name: string | undefined, email: string): string => (name ? `${name} <${email}>` : email);

/**
 * Effect dispatched when reference data changes out-of-band (e.g. objects finish loading) so that
 * already-rendered reference decorations re-resolve without a document change.
 */
export const refEditorRedecorate = StateEffect.define<null>();

export type RefEditorExtensionOptions = {
  mode?: RefEditorMode;
  /** Resolve an object id referenced as `@<id>` to display info. */
  getRef?: (id: string) => RefInfo | undefined;
  /** Pluggable raw-token matcher (e.g. {@link EMAIL_REGEX}); matching tokens render as neutral tags. */
  match?: RegExp;
  colorize?: boolean;
};

/**
 * CodeMirror extension rendering reference-editor tokens as tags. Tags are atomic: the cursor
 * cannot enter them and deletion removes the whole token.
 * - `'ref'` mode: `@<id>` references resolve to the object's label (via
 *   {@link RefEditorExtensionOptions.getRef}); tokens accepted by the pluggable `match` regexp
 *   render as neutral tags.
 * - `'email'` mode: RFC 5322 mailboxes render as tags labelled with the display name (falling
 *   back to the address); the trailing comma separator is hidden inside the tag's atomic range.
 */
export const refEditor = ({ mode = 'ref', getRef, match, colorize }: RefEditorExtensionOptions = {}): Extension => {
  // Forward declaration: the field is defined below but the widgets' delete affordance (built inside
  // the field's `create`/`update`) needs to read it back at click time.
  let decoField: StateField<DecorationSet>;

  /** Delete the tag whose delete affordance (`node`) was clicked, keeping the delimited list well-formed. */
  const removeToken = (view: EditorView, node: HTMLElement) => {
    // Tags render in document order, so the button's index among all delete affordances selects the
    // matching decoration. (A replace-widget's inner DOM has no reliable document position to query.)
    const index = [...view.contentDOM.querySelectorAll('button[aria-label="Remove"]')].indexOf(node);
    if (index < 0) {
      return;
    }
    const cursor = view.state.field(decoField).iter();
    let range: { from: number; to: number } | undefined;
    for (let current = 0; cursor.value; current++, cursor.next()) {
      if (current === index) {
        range = { from: cursor.from, to: cursor.to };
        break;
      }
    }
    if (!range) {
      return;
    }

    const doc = view.state.doc.toString();
    let { from } = range;
    const { to } = range;
    if (mode === 'email' && !/,\s*$/.test(doc.slice(from, to))) {
      // A last segment carries no trailing ", "; drop the one left dangling by the previous segment.
      const dangling = doc.slice(0, from).match(/,\s*$/);
      if (dangling) {
        from -= dangling[0].length;
      }
    }
    view.dispatch({ changes: { from, to }, selection: { anchor: from } });
  };

  const buildRefDecorations = (state: EditorState) => {
    const deco = new RangeSetBuilder<Decoration>();
    const text = state.doc.toString();
    const tokenRegex = /\S+/g;
    let tokenMatch: RegExpExecArray | null;
    while ((tokenMatch = tokenRegex.exec(text))) {
      const token = tokenMatch[0];
      const from = tokenMatch.index;
      const to = from + token.length;

      const refMatch = token.match(REF_REGEX);
      if (refMatch) {
        const ref = getRef?.(refMatch[1]);
        if (ref) {
          deco.add(
            from,
            to,
            Decoration.replace({
              widget: new RefWidget(
                ref.label,
                ref.hue ?? (colorize ? getHashHue(refMatch[1]) : undefined),
                removeToken,
              ),
            }),
          );
        }
        continue;
      }

      if (match?.test(token)) {
        deco.add(
          from,
          to,
          Decoration.replace({
            widget: new RefWidget(token, undefined, removeToken),
          }),
        );
      }
    }

    return deco.finish();
  };

  const buildEmailDecorations = (state: EditorState) => {
    const addrRegex = match ?? EMAIL_REGEX;
    const deco = new RangeSetBuilder<Decoration>();
    const text = state.doc.toString();
    // Segments are comma-separated; a segment's atomic range includes its trailing comma (and
    // following whitespace) so the separator never renders.
    const segmentRegex = /[^,]+(?:,\s*)?|,\s*/g;
    let segmentMatch: RegExpExecArray | null;
    while ((segmentMatch = segmentRegex.exec(text))) {
      const segment = segmentMatch[0];
      const commaIndex = segment.indexOf(',');
      const content = (commaIndex === -1 ? segment : segment.slice(0, commaIndex)).trim();
      if (!content) {
        continue;
      }
      // Only tag committed segments (those with a trailing comma). The final segment being typed has
      // no comma yet, so a valid-looking address stays plain text until the user commits it (comma,
      // space, or Enter) — otherwise the tag would pop in mid-typing.
      if (commaIndex === -1) {
        continue;
      }
      const leading = segment.length - segment.trimStart().length;
      const from = segmentMatch.index + leading;
      const to = segmentMatch.index + segment.length;

      const nameAddr = content.match(NAME_ADDR_REGEX);
      if (nameAddr) {
        deco.add(
          from,
          to,
          Decoration.replace({
            widget: new RefWidget(
              nameAddr[1] || nameAddr[2],
              colorize ? getHashHue(nameAddr[2]) : undefined,
              removeToken,
            ),
          }),
        );
      } else if (addrRegex.test(content)) {
        deco.add(
          from,
          to,
          Decoration.replace({
            widget: new RefWidget(content, undefined, removeToken),
          }),
        );
      }
    }

    return deco.finish();
  };

  const buildDecorations = mode === 'email' ? buildEmailDecorations : buildRefDecorations;

  decoField = StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state),
    update: (deco, tr) => {
      if (tr.docChanged || tr.effects.some((effect) => effect.is(refEditorRedecorate))) {
        return buildDecorations(tr.state);
      }

      return deco;
    },
    provide: (field) => [
      EditorView.decorations.from(field),
      // Every tag is atomic: arrow motion skips the whole range and deletion removes the whole token.
      EditorView.atomicRanges.of((view) => view.state.field(field)),
    ],
  });

  const separator = mode === 'email' ? ', ' : ' ';

  // Typing immediately before a tag would otherwise re-tokenize into it (e.g. `x` + `bob@e.com`
  // parses as the single email `xbob@e.com`); inject the delimiter after the inserted text so the
  // new characters begin their own token (and open a fresh completion) rather than joining the tag.
  const separatorFilter = EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || !tr.isUserEvent('input')) {
      return tr;
    }
    const tags = tr.startState.field(decoField, false);
    if (!tags) {
      return tr;
    }

    let extra: TransactionSpec | undefined;
    tr.changes.iterChanges((fromA, toA, _fromB, toB, inserted) => {
      if (extra || fromA !== toA) {
        return;
      }
      const text = inserted.toString();
      if (!text || /[\s,]$/.test(text)) {
        return;
      }
      // A tag starting exactly at the insertion point means the new text abuts it.
      let abutsTag = false;
      for (const cursor = tags.iter(); cursor.value; cursor.next()) {
        if (cursor.from === fromA) {
          abutsTag = true;
          break;
        }
        if (cursor.from > fromA) {
          break;
        }
      }
      if (abutsTag) {
        extra = { changes: { from: toB, insert: separator }, sequential: true, selection: { anchor: toB } };
      }
    });

    return extra ? [tr, extra] : tr;
  });

  return [styles, decoField, separatorFilter];
};

/** Delete an atomic tag given the DOM node of its widget. */
type RemoveToken = (view: EditorView, node: HTMLElement) => void;

/**
 * The outer span vertically aligns the tag with the surrounding line and adds a trailing gap so
 * adjacent tags don't touch. The inner span carries the border; `overflow-hidden` clips the child
 * fills to its radius (a square-cornered fill otherwise peeks past the rounded border).
 */
const container = (classNames: string, ...children: Domino<HTMLElement>[]) => {
  const inner = Domino.of('span')
    .classNames(mx('inline-flex items-stretch border rounded-xs overflow-hidden', classNames))
    .append(...children);
  return Domino.of('span').classNames('inline-flex align-middle pe-1').append(inner).root;
};

/** Trailing `x` affordance that deletes the tag it belongs to. */
const deleteButton = (view: EditorView, remove: RemoveToken) => {
  const button = Domino.of('button')
    .classNames('flex items-center px-1 text-description hover:text-error cursor-pointer')
    .attributes({ 'type': 'button', 'aria-label': 'Remove' })
    .append(Domino.svg('ph--x--bold').classNames('shrink-0 w-3.5 h-3.5'))
    // `mousedown` + preventDefault so clicking the affordance does not move the editor selection.
    .on('mousedown', (event) => {
      event.preventDefault();
      remove(view, button.root);
    });
  return button;
};

/**
 * Resolved reference (object reference or RFC 5322 mailbox), rendered as the object's label with a
 * trailing delete affordance.
 */
class RefWidget extends WidgetType {
  constructor(
    private readonly _label: string,
    private readonly _hue: string | undefined,
    private readonly _remove: RemoveToken,
  ) {
    super();
  }

  override eq(other: this) {
    return this._label === other._label && this._hue === other._hue;
  }

  override toDOM(view: EditorView) {
    const styles = this._hue ? getStyles(this._hue) : undefined;
    return container(
      mx('border-separator rounded-sm', styles?.border),
      Domino.of('span').classNames('flex items-center ps-2 pe-1').text(this._label),
      deleteButton(view, this._remove),
    );
  }
}

const styles = EditorView.theme({
  // Single-line editor: lay the line out as a centered flex row so text runs and the atomic tag
  // widgets share a vertical center (avoids `vertical-align` baseline guesswork between the two).
  '.cm-line': {
    padding: '0',
    display: 'flex',
    alignItems: 'center',
  },
});
