//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { Domino } from '@dxos/ui';
import { focus, focusField } from '@dxos/ui-editor';
import { getHashHue, getStyles, mx } from '@dxos/ui-theme';

/**
 * Display info for a resolved actor reference.
 */
export type ActorInfo = {
  label: string;
  hue?: string;
};

export type ActorListOptions = {
  /** Resolve an actor (person) id referenced as `@<id>` to display info. */
  getActor?: (id: string) => ActorInfo | undefined;
};

/** Matches an actor reference token (`@<object id>`). */
export const ACTOR_REF_REGEX = /^@([A-Za-z0-9]+)$/;

/** Matches a well-formed email address token. */
export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Effect dispatched when actor data changes out-of-band (e.g. people finish loading) so that
 * already-rendered reference decorations re-resolve without a document change.
 */
export const actorListRedecorate = StateEffect.define<null>();

/**
 * CodeMirror extension rendering actor-list tokens as tags: `@<id>` references resolve to the
 * person's name (via {@link ActorListOptions.getActor}); well-formed email tokens render as
 * neutral tags. The token under the cursor stays raw so it can be edited.
 */
export const actorList = ({ getActor }: ActorListOptions = {}): Extension => {
  const buildDecorations = (state: EditorState) => {
    const hasFocus = state.field(focusField);
    const { head } = state.selection.main;
    const deco = new RangeSetBuilder<Decoration>();
    const text = state.doc.toString();
    const tokenRegex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(text))) {
      const token = match[0];
      const from = match.index;
      const to = from + token.length;
      // Leave the token raw while the cursor is inside it so it can be edited.
      if (hasFocus && head >= from && head <= to) {
        continue;
      }

      const refMatch = token.match(ACTOR_REF_REGEX);
      if (refMatch) {
        const actor = getActor?.(refMatch[1]);
        if (actor) {
          deco.add(
            from,
            to,
            Decoration.widget({
              widget: new ActorWidget(actor.label, actor.hue ?? getHashHue(refMatch[1])),
              atomic: true,
            }),
          );
        }
        continue;
      }

      if (EMAIL_REGEX.test(token)) {
        deco.add(
          from,
          to,
          Decoration.widget({
            widget: new EmailWidget(token),
            atomic: true,
          }),
        );
      }
    }

    return deco.finish();
  };

  return [
    focus,
    styles,
    StateField.define<DecorationSet>({
      create: (state) => buildDecorations(state),
      update: (deco, tr) => {
        if (tr.docChanged || tr.newSelection || tr.effects.some((effect) => effect.is(actorListRedecorate))) {
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
 * Resolved actor reference (`@<id>`), rendered as the person's name.
 */
class ActorWidget extends WidgetType {
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
 * Well-formed email address token.
 */
class EmailWidget extends WidgetType {
  constructor(private readonly _email: string) {
    super();
  }

  override eq(other: this) {
    return this._email === other._email;
  }

  override toDOM() {
    return container(
      'border-separator',
      Domino.of('span').classNames('flex items-center px-1 text-subdued text-sm').text(this._email),
    );
  }
}

const styles = EditorView.theme({
  '.cm-line': {
    lineHeight,
  },
});
