//
// Copyright 2026 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import React, { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  type EditorController,
  type EditorMenuProviderProps,
  type EditorViewProps,
  type UseEditorMenuProps,
} from '@dxos/react-ui-editor';
import { Person } from '@dxos/types';
import { createBasicExtensions, createThemeExtensions, insertAtCursor, keymap } from '@dxos/ui-editor';
import { getHashHue } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { type ActorInfo, actorList, actorListRedecorate } from './actor-extension';

export type ActorListProps = ThemedClassName<
  {
    /** Database queried for `Person` objects (name/email typeahead and reference resolution). */
    db?: Database.Database;
    value?: string;
    readonly?: boolean;
    /** Open the typeahead while typing (the `@` trigger remains available but is not required). */
    activateOnTyping?: boolean;
  } & Omit<EditorViewProps, 'initialValue'> &
    Pick<EditorMenuProviderProps, 'numItems'>
>;

/**
 * Single-line input for a list of actors (people). Typing `@` (or any text, with
 * `activateOnTyping`) opens a typeahead menu that matches a person's name or one of their email
 * addresses; selecting a person inserts an `@<id>` reference, selecting an email completes the
 * address. Tokens are whitespace-separated and each is either a person reference or a well-formed
 * email address. References render as tags with the person's name; emails render as neutral tags.
 */
export const ActorList = forwardRef<EditorController, ActorListProps>(
  ({ db, value, readonly, activateOnTyping, numItems = 8, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { themeMode } = useThemeContext();

    // Reads go through a ref so the decoration extension stays stable: recreating extensions
    // destroys and recreates the editor, which would blur the input on data changes.
    const people = useQuery(db, Filter.type(Person.Person));
    const actors = useMemo(
      () =>
        new Map<string, ActorInfo>(
          people.map((person) => [person.id, { label: getActorLabel(person), hue: getHashHue(person.id) }]),
        ),
      [people],
    );
    const actorsRef = useRef(actors);
    actorsRef.current = actors;

    // Internal controller (merged with the forwarded ref) used to re-resolve reference
    // decorations when person data changes after the document was rendered.
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
      controllerRef.current?.view?.dispatch({ effects: actorListRedecorate.of(null) });
    }, [actors]);

    const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
      async ({ text }) => {
        const query = (text ?? '').replace(/^@/, '').toLowerCase();
        const matches = people.filter((person) => {
          if (!query) {
            return true;
          }
          return (
            getActorLabel(person).toLowerCase().includes(query) ||
            (person.emails ?? []).some(({ value }) => value.toLowerCase().includes(query))
          );
        });

        // Known email addresses matching the query, offered as raw-email completions.
        const emails = query
          ? [
              ...new Set(
                people.flatMap((person) =>
                  (person.emails ?? [])
                    .map(({ value }) => value)
                    .filter((email) => email.toLowerCase().includes(query)),
                ),
              ),
            ]
          : [];

        return [
          {
            id: 'actors',
            items: matches.slice(0, numItems).map((person) => {
              const label = getActorLabel(person);
              const email = person.emails?.[0]?.value;
              return {
                id: person.id,
                label: email && email !== label ? `${label} (${email})` : label,
                icon: 'ph--user--regular',
                onSelect: ({ view, head }: { view: EditorView; head: number }) =>
                  insertAtCursor(view, head, `@${person.id} `),
              };
            }),
          },
          {
            id: 'emails',
            items: emails.slice(0, numItems).map((email) => ({
              id: `email-${email}`,
              label: email,
              icon: 'ph--envelope-simple--regular',
              onSelect: ({ view, head }: { view: EditorView; head: number }) => insertAtCursor(view, head, `${email} `),
            })),
          },
        ];
      },
      [people, numItems],
    );

    // NOTE: The placeholder is supplied via the popover (Editor.Root) so the trigger hint and the
    // empty-state hint are a single message; a second basic-extension placeholder would stack with it.
    // Must be referentially stable: the menu extension is memoized on it, and a new extension
    // identity destroys and recreates the editor on every keystroke.
    const placeholder = useMemo(
      () => ({
        content: t(activateOnTyping ? 'actor-list-auto.placeholder' : 'actor-list.placeholder'),
        focusOnly: false,
      }),
      [t, activateOnTyping],
    );

    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({ readOnly: readonly, lineWrapping: false }),
        createThemeExtensions({ themeMode, slots: { scroller: { className: 'scrollbar-none' } } }),
        actorList({ getActor: (id) => actorsRef.current.get(id) }),
        Prec.highest(
          keymap.of([
            {
              key: 'Enter',
              run: () => {
                // Prevent newline.
                return true;
              },
            },
          ]),
        ),
      ],
      [readonly, themeMode],
    );

    return (
      <Editor.Root
        ref={composedRef}
        extensions={extensions}
        numItems={numItems}
        trigger='@'
        activateOnTyping={activateOnTyping}
        placeholder={placeholder}
        // The menu owns its own matching (names AND emails); the built-in label filter would
        // drop email-matched people whose label doesn't start with the query.
        filter={false}
        getMenu={getMenu}
      >
        <Editor.View {...props} initialValue={value} selectionEnd />
      </Editor.Root>
    );
  },
);

ActorList.displayName = 'ActorList';

/**
 * Display name for a person (label annotation falls back through preferred/full/nickname),
 * then primary email, then id.
 */
const getActorLabel = (person: Person.Person): string => {
  return Obj.getLabel(person) ?? person.emails?.[0]?.value ?? person.id;
};
