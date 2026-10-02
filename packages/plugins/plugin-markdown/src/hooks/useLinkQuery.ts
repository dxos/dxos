//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { Annotation, Database, Filter, Obj, Query, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { type EditorMenuGroup, type EditorMenuItem } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ThemeProvider from '@dxos/react-ui/ThemeProvider';
import { insertAtCursor, insertAtLineStart } from '@dxos/ui-editor';

import { meta } from '#meta';

const getLabel = (object: Obj.Unknown): ThemeProvider.Label => {
  const typename = Obj.getTypename(object);
  // A typeless object cannot key a translation namespace, so it falls back to the literal.
  const placeholder: ThemeProvider.Label = typename
    ? ['object-name.placeholder', { ns: typename, defaultValue: 'New object' }]
    : 'New object';
  return Obj.getLabel(object) ?? placeholder;
};

// Object names are free text, so an unescaped "]" or newline would terminate the link syntax early
// and persist a broken link into the document.
const escapeLinkLabel = (label: string): string => label.replace(/[[\]]/g, '\\$&').replace(/\s*\r?\n\s*/g, ' ');

/**
 * Insert a link to `object`; "@@" (block mode) puts a block embed on its own line.
 */
const insertLink = (view: EditorView, head: number, label: string, uri: string, block: boolean): void => {
  const link = `[${escapeLinkLabel(label)}](${uri})`;
  if (block) {
    insertAtLineStart(view, head, `!${link}\n`);
  } else {
    insertAtCursor(view, head, `${link} `);
  }
};

export const useLinkQuery = (db: Database.Database | undefined, current?: Obj.Unknown) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { invokePromise } = AppHooks.useOperationInvoker();

  const filter = useMemo(
    () =>
      Filter.or(
        ...(db ? db.graph.registry.list().filter(Type.isType) : [])
          .filter((schema) => TypeOptions.isUserType(schema))
          .map((schema) => Filter.type(Type.getURI(schema))),
      ),
    [db],
  );

  const handleLinkQuery = useCallback(
    (query?: string): Promise<EditorMenuGroup[]> => {
      if (!db) {
        return Promise.resolve([]);
      }

      // A second "@" switches the link query into block-embed mode, so "@@foo" searches for "foo".
      const raw = query ?? '';
      const block = raw.startsWith('@');
      const text = block ? raw.slice(1) : raw;
      const name = text.toLowerCase();

      return Effect.gen(function* () {
        const [results, containing] = yield* Effect.all(
          [
            Database.query(Query.select(filter)).run,
            current ? Database.query(ContainerModel.containing(current)).run : Effect.succeed([]),
          ],
          { concurrency: 'unbounded' },
        );

        const items = results
          // Exclude the current document; it cannot link to itself.
          .filter((object) => object.id !== current?.id)
          .map((object: Obj.Unknown) => ({ object, label: ThemeProvider.toLocalizedString(getLabel(object), t) }))
          .filter(({ label }) => label.toLowerCase().includes(name))
          .sort((a, b) => a.label.localeCompare(b.label))
          .map(({ object, label }): EditorMenuItem => {
            const type = Obj.getType(object);
            const icon = type
              ? Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(type)))?.icon
              : undefined;
            return {
              id: object.id,
              label,
              icon,
              onSelect: ({ view, head }) => insertLink(view, head, label, Obj.getURI(object), block),
            };
          });

        // File new objects in the current document's collection; with no containing collection
        // `OpenObjectForm` falls back to the space's own default placement.
        const target = containing[0] ?? db;

        const createItem: EditorMenuItem = {
          id: 'create-object',
          label: ['add-object.label', { ns: meta.profile.key }],
          icon: 'ph--plus--regular',
          onSelect: ({ view, head }) => {
            void invokePromise?.(SpaceOperation.OpenObjectForm, {
              target,
              // Keep the deck where it is: the link is inserted back into the editor the user is in.
              navigable: false,
              // As typed: the lowercased copy is only for matching.
              defaults: text ? { name: text } : undefined,
            }).then(({ data }) => {
              const object = data?.target;
              if (object) {
                insertLink(view, head, ThemeProvider.toLocalizedString(getLabel(object), t), Obj.getURI(object), block);
                view.focus();
              }
            });
          },
        };

        return [
          { id: 'create', items: [createItem] },
          { id: 'echo', items },
        ];
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    },
    [db, filter, t, current, invokePromise],
  );

  return handleLinkQuery;
};
