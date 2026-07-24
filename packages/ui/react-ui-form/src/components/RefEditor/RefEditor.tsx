//
// Copyright 2026 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import React, { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';

import { type Database, Filter, Obj, type Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  type EditorController,
  type EditorMenuProviderProps,
  type EditorViewProps,
  type UseEditorMenuProps,
} from '@dxos/react-ui-editor';
import { createBasicExtensions, createThemeExtensions, insertAtCursor, keymap } from '@dxos/ui-editor';
import { getHashHue } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import {
  EMAIL_REGEX,
  NAME_ADDR_REGEX,
  type RefEditorMode,
  type RefInfo,
  formatMailbox,
  refEditor,
  refEditorRedecorate,
} from './ref-editor-extension';

export type RefEditorProps = ThemedClassName<
  {
    /** Database queried for objects of {@link RefEditorProps.type}. */
    db?: Database.Database;
    /** ECHO object type whose instances are offered in the typeahead and referenced as `@<id>`. */
    type: Type.AnyObj;
    value?: string;
    readonly?: boolean;
    /**
     * Content model:
     * - `'ref'` (default): the picker only matches existing objects; selection inserts an
     *   `@<id>` reference (raw tokens accepted by `match` are also allowed).
     * - `'email'`: the picker shows one item per (object, value) pair and selection captures the
     *   value; the content is an RFC 5322 mailbox list (`Name <email>, ...`) with the comma
     *   separators hidden inside the tags.
     */
    mode?: RefEditorMode;
    /** Pluggable raw-token matcher (e.g. {@link EMAIL_REGEX}); matching tokens are accepted as values. */
    match?: RegExp;
    /** Display label for an object; defaults to `Obj.getLabel` falling back to the id. */
    getLabel?: (object: Obj.Unknown) => string;
    /** Values an object can be captured as in `'email'` mode (e.g. a person's email addresses). */
    getValues?: (object: Obj.Unknown) => readonly string[];
    /** Menu item icon. */
    icon?: string;
    /** Already-translated placeholder; defaults to a generic hint. */
    placeholder?: string;
    /** Open the typeahead while typing (the `@` trigger remains available but is not required). */
    activateOnTyping?: boolean;
  } & Omit<EditorViewProps, 'initialValue'> &
    Pick<EditorMenuProviderProps, 'numItems'>
>;

/**
 * Single-line input for a list of object references. Typing `@` (or any text, with
 * `activateOnTyping`) opens a typeahead menu matching objects of the given type by label (and
 * by their `getValues` values). The content model depends on {@link RefEditorProps.mode}.
 * Resolved entries render as atomic tags with the object's label; raw tokens accepted by the
 * pluggable `match` regexp render as neutral tags.
 */
export const RefEditor = forwardRef<EditorController, RefEditorProps>(
  (
    {
      db,
      type,
      value,
      readonly,
      mode = 'ref',
      match,
      getLabel,
      getValues,
      icon = 'ph--link--regular',
      placeholder: placeholderProp,
      activateOnTyping,
      numItems = 8,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const { themeMode } = useThemeContext();
    const getObjectLabel = useCallback(
      (object: Obj.Unknown) => getLabel?.(object) ?? Obj.getLabel(object) ?? object.id,
      [getLabel],
    );

    // Reads go through a ref so the decoration extension stays stable: recreating extensions
    // destroys and recreates the editor, which would blur the input on data changes.
    const filter = useMemo(() => Filter.type(type), [type]);
    const objects = useQuery(db, filter);
    const refs = useMemo(
      () =>
        new Map<string, RefInfo>(
          objects.map((object) => [object.id, { label: getObjectLabel(object), hue: getHashHue(object.id) }]),
        ),
      [objects, getObjectLabel],
    );
    const refsRef = useRef(refs);
    refsRef.current = refs;

    // Internal controller (merged with the forwarded ref) used to re-resolve reference
    // decorations when object data changes after the document was rendered.
    const controllerRef = useRef<EditorController | null>(null);
    const composedRef = useCallback(
      (controller: EditorController | null) => {
        controllerRef.current = controller;
        if (typeof forwardedRef === 'function') {
          forwardedRef(controller);
        } else if (forwardedRef) {
          forwardedRef.current = controller;
        }
      },
      [forwardedRef],
    );
    useEffect(() => {
      controllerRef.current?.view?.dispatch({ effects: refEditorRedecorate.of(null) });
    }, [refs]);

    const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
      async ({ text }) => {
        // With `activateOnTyping` (no `@` trigger) an empty query would otherwise match every object
        // and anchor the popover at the viewport origin (no range to position against). Show nothing
        // until the user types. An explicit `@` trigger still browses (its `text` is '@', not empty).
        if (!text) {
          return [];
        }
        const query = text.replace(/^@/, '').toLowerCase();
        const matchesQuery = (object: Obj.Unknown) =>
          !query ||
          getObjectLabel(object).toLowerCase().includes(query) ||
          (getValues?.(object) ?? []).some((entry) => entry.toLowerCase().includes(query));

        if (mode === 'email') {
          // One item per (object, value) pair; selection captures the value as an RFC 5322 mailbox.
          const mailboxes = objects
            .flatMap((object) => (getValues?.(object) ?? []).map((entry) => ({ object, entry })))
            .filter(
              ({ object, entry }) =>
                !query || getObjectLabel(object).toLowerCase().includes(query) || entry.toLowerCase().includes(query),
            );

          return [
            {
              id: 'mailboxes',
              items: mailboxes.slice(0, numItems * 2).map(({ object, entry }) => ({
                id: `${object.id}-${entry}`,
                label: `${getObjectLabel(object)} (${entry})`,
                icon,
                onSelect: ({ view, head }: { view: EditorView; head: number }) =>
                  insertMailbox(view, head, formatMailbox(getObjectLabel(object), entry)),
              })),
            },
          ];
        }

        // 'ref' mode: only match existing objects.
        return [
          {
            id: 'refs',
            items: objects
              .filter(matchesQuery)
              .slice(0, numItems * 2)
              .map((object) => {
                const label = getObjectLabel(object);
                const detail = getValues?.(object)?.[0];
                return {
                  id: object.id,
                  label: detail && detail !== label ? `${label} (${detail})` : label,
                  icon,
                  onSelect: ({ view, head }: { view: EditorView; head: number }) =>
                    insertAtCursor(view, head, `@${object.id} `),
                };
              }),
          },
        ];
      },
      [objects, numItems, mode, icon, getObjectLabel, getValues],
    );

    // NOTE: The placeholder is supplied via the popover (Editor.Root) so the trigger hint and the
    // empty-state hint are a single message; a second basic-extension placeholder would stack with it.
    // Must be referentially stable: the menu extension is memoized on it, and a new extension
    // identity destroys and recreates the editor on every keystroke.
    const placeholder = useMemo(
      () => ({
        content: placeholderProp ?? t(activateOnTyping ? 'ref-editor-auto.placeholder' : 'ref-editor.placeholder'),
        focusOnly: false,
      }),
      [t, placeholderProp, activateOnTyping],
    );

    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({ readOnly: readonly, lineWrapping: false }),
        createThemeExtensions({
          themeMode,
          slots: {
            editor: {
              className: 'w-full',
            },
            scroller: {
              className: 'scrollbar-none',
            },
          },
        }),
        refEditor({ mode, match, getRef: (id) => refsRef.current.get(id) }),
        Prec.highest(
          keymap.of([
            {
              key: 'Enter',
              // Commit the in-progress token when it matches (insert the mode's separator, the
              // same gesture as typing it); always consume the key (single-line input).
              run: (view) => {
                const { head } = view.state.selection.main;
                const line = view.state.doc.lineAt(head);
                const before = line.text.slice(0, head - line.from);
                if (mode === 'email') {
                  const segment = before.slice(before.lastIndexOf(',') + 1).trim();
                  if (NAME_ADDR_REGEX.test(segment) || (match ?? EMAIL_REGEX).test(segment)) {
                    insertAtCursor(view, head, ', ');
                  }
                } else {
                  const token = before.slice(before.search(/\S+$/));
                  if (token && match?.test(token)) {
                    insertAtCursor(view, head, ' ');
                  }
                }
                return true;
              },
            },
            {
              key: 'Space',
              // In email mode, a space after a bare address commits it (a tag only forms once
              // committed). A partial `Name <…` segment still needs spaces, so only commit — and
              // consume the space — when the whole in-progress segment is an address.
              run: (view) => {
                if (mode !== 'email') {
                  return false;
                }
                const { head } = view.state.selection.main;
                const line = view.state.doc.lineAt(head);
                const before = line.text.slice(0, head - line.from);
                const segment = before.slice(before.lastIndexOf(',') + 1).trim();
                if ((match ?? EMAIL_REGEX).test(segment)) {
                  insertAtCursor(view, head, ', ');
                  return true;
                }
                return false;
              },
            },
          ]),
        ),
      ],
      [readonly, themeMode, mode, match],
    );

    return (
      <Editor.Root
        extensions={extensions}
        numItems={numItems}
        trigger='@'
        activateOnTyping={activateOnTyping}
        placeholder={placeholder}
        // The menu owns its own matching (labels AND values); the built-in label filter would
        // drop value-matched objects whose label doesn't start with the query.
        filter={false}
        getMenu={getMenu}
        ref={composedRef}
      >
        <Editor.View
          classNames='flex items-center dx-input px-2 h-[2rem]'
          {...props}
          initialValue={value}
          selectionEnd
        />
      </Editor.Root>
    );
  },
);

RefEditor.displayName = 'RefEditor';

/**
 * Insert an RFC 5322 mailbox, replacing the in-progress segment (anything typed after the last
 * comma — multi-word queries can leave words outside the popover's completion range).
 */
const insertMailbox = (view: EditorView, head: number, mailbox: string) => {
  const line = view.state.doc.lineAt(head);
  const before = line.text.slice(0, head - line.from);
  const lastComma = before.lastIndexOf(',');
  const from = line.from + (lastComma === -1 ? 0 : lastComma + 1);
  const insert = `${lastComma === -1 ? '' : ' '}${mailbox}, `;
  view.dispatch({
    changes: { from, to: head, insert },
    selection: { anchor: from + insert.length, head: from + insert.length },
  });
};
