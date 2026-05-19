//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import { Annotation, type Database, Filter, Obj, Query, Type } from '@dxos/echo';
import { runSyncAndForwardErrors } from '@dxos/effect';
import { EntityKind, SystemTypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';
import { type Label, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type EditorMenuGroup, type EditorMenuItem } from '@dxos/react-ui-editor';
import { insertAtCursor, insertAtLineStart } from '@dxos/ui-editor';

import { Markdown } from '../types';

export const useLinkQuery = (db: Database.Database | undefined) => {
  const { t } = useTranslation();

  const filter = useMemo(
    () =>
      Filter.or(
        ...(db ? runSyncAndForwardErrors(db.graph.registry.listTypes()) : [])
          .filter((schema) => getTypeAnnotation(schema)?.kind !== EntityKind.Relation)
          .filter((schema) => !SystemTypeAnnotation.get(schema).pipe(Option.getOrElse(() => false)))
          .map((schema) => Filter.typename(Type.getTypename(schema))),
      ),
    [db],
  );

  const handleLinkQuery = useCallback(
    async (query?: string): Promise<EditorMenuGroup[]> => {
      // A second "@" switches the link query into block-embed mode, so "@@foo" searches for "foo".
      const name = query?.startsWith('@') ? query.slice(1).toLowerCase() : (query?.toLowerCase() ?? '');
      const results = await db?.query(Query.select(filter)).run();

      const getLabel = (object: Obj.Unknown): Label => {
        const type = Obj.getTypename(object)!;
        return Obj.getLabel(object) ?? ['object-name.placeholder', { ns: type, defaultValue: 'New object' }];
      };

      const items =
        results
          ?.filter((object) => toLocalizedString(getLabel(object), t).toLowerCase().includes(name))
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
          }) ?? [];

      // Add "Create new document" option at the end.
      const createItem: EditorMenuItem = {
        id: 'create-document',
        label: ['add-object.label', { ns: Type.getTypename(Markdown.Document) }],
        icon: 'ph--plus--regular',
        onSelect: ({ view, head }) => {
          const doc = Markdown.make({ name: name || undefined });
          db?.add(doc);
          const label = name || t('object-name.placeholder', { ns: Type.getTypename(Markdown.Document) });
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
    },
    [db, filter, t],
  );

  return handleLinkQuery;
};
