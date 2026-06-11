//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
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

export type RefEditorExtensionOptions = {
  mode?: RefEditorMode;
  /** Resolve an object id referenced as `@<id>` to display info. */
  getRef?: (id: string) => RefInfo | undefined;
  /** Pluggable raw-token matcher (e.g. {@link EMAIL_REGEX}); matching tokens render as neutral tags. */
  match?: RegExp;
};

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

/**
 * CodeMirror extension rendering reference-editor tokens as tags. Tags are atomic: the cursor
 * cannot enter them and deletion removes the whole token.
 * - `'ref'` mode: `@<id>` references resolve to the object's label (via
 *   {@link RefEditorExtensionOptions.getRef}); tokens accepted by the pluggable `match` regexp
 *   render as neutral tags.
 * - `'email'` mode: RFC 5322 mailboxes render as tags labelled with the display name (falling
 *   back to the address); the trailing comma separator is hidden inside the tag's atomic range.
 */
export const refEditor = ({ mode = 'ref', getRef, match }: RefEditorExtensionOptions = {}): Extension => {
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
            Decoration.widget({
              widget: new RefWidget(ref.label, ref.hue ?? getHashHue(refMatch[1])),
              atomic: true,
            }),
          );
        }
        continue;
      }

      if (match?.test(token)) {
        deco.add(
          from,
          to,
          Decoration.widget({
            widget: new TokenWidget(token),
            atomic: true,
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
      const leading = segment.length - segment.trimStart().length;
      const from = segmentMatch.index + leading;
      const to = segmentMatch.index + segment.length;

      const nameAddr = content.match(NAME_ADDR_REGEX);
      if (nameAddr) {
        deco.add(
          from,
          to,
          Decoration.widget({
            widget: new RefWidget(nameAddr[1] || nameAddr[2], getHashHue(nameAddr[2])),
            atomic: true,
          }),
        );
      } else if (addrRegex.test(content)) {
        deco.add(
          from,
          to,
          Decoration.widget({
            widget: new TokenWidget(content),
            atomic: true,
          }),
        );
      }
    }

    return deco.finish();
  };

  const buildDecorations = mode === 'email' ? buildEmailDecorations : buildRefDecorations;

  return [
    styles,
    StateField.define<DecorationSet>({
      create: (state) => buildDecorations(state),
      update: (deco, tr) => {
        if (tr.docChanged || tr.effects.some((effect) => effect.is(refEditorRedecorate))) {
          return buildDecorations(tr.state);
        }

        return deco;
      },
      provide: (field) => [
        EditorView.decorations.from(field),
        EditorView.atomicRanges.of((view) => {
          const builder = new RangeSetBuilder<Decoration>();
          const cursor = view.state.field(field).iter();
          while (cursor.value) {
            if (cursor.value.spec.atomic) {
              builder.add(cursor.from, cursor.to, cursor.value);
            }
            cursor.next();
          }

          return builder.finish();
        }),
      ],
    }),
  ];
};

const lineHeight = '30px';

/**
 * NOTE: The outer container vertically aligns the inner text with content in the outer div.
 */
const container = (classNames: string, ...children: Domino<HTMLElement>[]) => {
  const inner = Domino.of('span')
    .classNames(mx('inline-flex h-[26px] border rounded-xs', classNames))
    .append(...children);
  return Domino.of('span').classNames('inline-flex h-[28px] align-middle').append(inner).root;
};

/**
 * Resolved reference (object reference or RFC 5322 mailbox), rendered as the object's label.
 */
class RefWidget extends WidgetType {
  constructor(
    private readonly _label: string,
    private readonly _hue: string,
  ) {
    super();
  }

  override eq(other: this) {
    return this._label === other._label && this._hue === other._hue;
  }

  override toDOM() {
    const { bg: fill, border, surface } = getStyles(this._hue);
    return container(
      border,
      Domino.of('span').classNames(mx('flex items-center px-1 text-black text-xs', fill)).text('@'),
      Domino.of('span')
        .classNames(mx('flex items-center px-1 text-subdued text-sm rounded-r-[3px]', surface))
        .text(this._label),
    );
  }
}

/**
 * Raw token accepted by the pluggable matcher (e.g. an email address).
 */
class TokenWidget extends WidgetType {
  constructor(private readonly _token: string) {
    super();
  }

  override eq(other: this) {
    return this._token === other._token;
  }

  override toDOM() {
    return container(
      'border-separator',
      Domino.of('span').classNames('flex items-center px-1 text-subdued text-sm').text(this._token),
    );
  }
}

const styles = EditorView.theme({
  '.cm-line': {
    lineHeight,
  },
  // Match the standard Input block size (md density): 2.5rem, 2rem on pointer-fine devices.
  '.cm-scroller': {
    alignItems: 'center',
    minHeight: '2.5rem',
  },
  '@media (pointer: fine)': {
    '.cm-scroller': {
      minHeight: '2rem',
    },
  },
});
