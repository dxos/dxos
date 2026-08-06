//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as CollectionModel from '@dxos/app-toolkit/CollectionModel';
import { Annotation, Database, Filter, Obj, Query, Type } from '@dxos/echo';
import { HiddenAnnotation, getTypeAnnotation } from '@dxos/echo/Annotation';
import { Kind as EntityKind } from '@dxos/echo/Entity';
import { EffectEx } from '@dxos/effect';
import { SpaceOperation } from '@dxos/plugin-space';
import { type Label, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type EditorMenuGroup, type EditorMenuItem } from '@dxos/react-ui-editor';
import { insertAtCursor, insertAtLineStart } from '@dxos/ui-editor';

import { meta } from '#meta';

const getLabel = (object: Obj.Unknown): Label => {
  const typename = Obj.getTypename(object);
  // A typeless object cannot key a translation namespace, so it falls back to the literal.
  const placeholder: Label = typename
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
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  const filter = useMemo(
    () =>
      Filter.or(
        ...(db ? db.graph.registry.list().filter(Type.isType) : [])
          .filter((schema) => getTypeAnnotation(Type.getSchema(schema))?.kind !== EntityKind.Relation)
          .filter((schema) => !HiddenAnnotation.get(Type.getSchema(schema)).pipe(Option.getOrElse(() => false)))
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
      const block = query?.startsWith('@') ?? false;
      const name = (block ? query!.slice(1) : (query ?? '')).toLowerCase();

      return Effect.gen(function* () {
        const [results, containing] = yield* Effect.all(
          [
            Database.query(Query.select(filter)).run,
            current ? Database.query(CollectionModel.containing(current)).run : Effect.succeed([]),
          ],
          { concurrency: 'unbounded' },
        );

        const items = results
          // Exclude the current document; it cannot link to itself.
          .filter((object) => object.id !== current?.id)
          .map((object: Obj.Unknown) => ({ object, label: toLocalizedString(getLabel(object), t) }))
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
        // `OpenCreateObject` falls back to the space's own default placement.
        const target = containing[0] ?? db;

        const createItem: EditorMenuItem = {
          id: 'create-object',
          label: ['add-object.label', { ns: meta.profile.key }],
          icon: 'ph--plus--regular',
          onSelect: ({ view, head }) => {
            void invokePromise?.(SpaceOperation.OpenCreateObject, {
              target,
              // Keep the deck where it is: the link is inserted back into the editor the user is in.
              navigable: false,
              initialFormValues: name ? { name } : undefined,
              onCreateObject: (object: Obj.Unknown) => {
                insertLink(view, head, toLocalizedString(getLabel(object), t), Obj.getURI(object), block);
                view.focus();
              },
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
