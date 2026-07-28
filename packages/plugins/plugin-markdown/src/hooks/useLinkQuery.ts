//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { CollectionModel } from '@dxos/app-toolkit';
import { Annotation, Database, Filter, Obj, Query, Type } from '@dxos/echo';
import { HiddenAnnotation, getTypeAnnotation } from '@dxos/echo/Annotation';
import { Kind as EntityKind } from '@dxos/echo/Entity';
import { EffectEx } from '@dxos/effect';
import { SpaceOperation } from '@dxos/plugin-space';
import { type Label, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type EditorMenuGroup, type EditorMenuItem } from '@dxos/react-ui-editor';
import { insertAtCursor, insertAtLineStart } from '@dxos/ui-editor';

import { Markdown } from '../types';

export const useLinkQuery = (db: Database.Database | undefined, current?: Obj.Unknown) => {
  const { t } = useTranslation();
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

      return Effect.gen(function* () {
        // A second "@" switches the link query into block-embed mode, so "@@foo" searches for "foo".
        const name = query?.startsWith('@') ? query.slice(1).toLowerCase() : (query?.toLowerCase() ?? '');
        const [results, containing] = yield* Effect.all(
          [
            Database.query(Query.select(filter)).run,
            current ? Database.query(CollectionModel.containing(current)).run : Effect.succeed([]),
          ],
          { concurrency: 'unbounded' },
        );

        const getLabel = (object: Obj.Unknown): Label => {
          const typename = Obj.getTypename(object);
          // A typeless object cannot key a translation namespace, so it falls back to the literal.
          const placeholder: Label = typename
            ? ['object-name.placeholder', { ns: typename, defaultValue: 'New object' }]
            : 'New object';
          return Obj.getLabel(object) ?? placeholder;
        };

        const items = results
          // Exclude the current document; it cannot link to itself.
          .filter((object) => object.id !== current?.id)
          .filter((object) => toLocalizedString(getLabel(object), t).toLowerCase().includes(name))
          .map((object: Obj.Unknown): EditorMenuItem => {
            const type = Obj.getType(object);
            const icon = type
              ? Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(type)))?.icon
              : undefined;
            const label = toLocalizedString(getLabel(object), t);
            return {
              id: object.id,
              label,
              icon,
              onSelect: ({ view, head }) => {
                const link = `[${label}](${Obj.getURI(object)})`;
                // "@@" inserts a block embed on its own line instead of an inline link.
                if (query?.startsWith('@')) {
                  insertAtLineStart(view, head, `!${link}\n`);
                } else {
                  insertAtCursor(view, head, `${link} `);
                }
              },
            };
          });

        // File new objects in the current document's collection; with no containing collection
        // `AddObject` falls back to the space's own default placement.
        const target = containing[0] ?? db;

        // Add "Create new document" option at the end.
        const createItem: EditorMenuItem = {
          id: 'create-document',
          label: ['add-object.label', { ns: Type.getTypename(Markdown.Document) }],
          icon: 'ph--plus--regular',
          onSelect: ({ view, head }) => {
            const doc = Markdown.make({ name: name || undefined });
            void invokePromise?.(SpaceOperation.AddObject, { object: doc, target });
            const label = name || t('object-name.placeholder', { ns: Type.getTypename(Markdown.Document) });
            // `AddObject` attaches the object asynchronously, so this is the space-relative form of
            // its URI; the anchor/preview path resolves that against the current space.
            const link = `[${label}](${Obj.getURI(doc)})`;
            if (query?.startsWith('@')) {
              insertAtLineStart(view, head, `!${link}\n`);
            } else {
              insertAtCursor(view, head, `${link} `);
            }
          },
        };

        return [
          { id: 'echo', items },
          { id: 'create', items: [createItem] },
        ];
      }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);
    },
    [db, filter, t, current, invokePromise],
  );

  return handleLinkQuery;
};
