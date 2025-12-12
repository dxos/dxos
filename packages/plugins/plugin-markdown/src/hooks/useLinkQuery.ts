//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { usePluginManager } from '@dxos/app-framework/react';
import { type Database, Filter, Obj, Query, Type } from '@dxos/echo';
import { EntityKind, SystemTypeAnnotation, getTypeAnnotation } from '@dxos/echo/internal';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type EditorMenuGroup, type EditorMenuItem, insertAtCursor, insertAtLineStart } from '@dxos/react-ui-editor';

export const useLinkQuery = (db: Database.Database | undefined) => {
  const { t } = useTranslation();

  const manager = usePluginManager();
  const resolve = useCallback(
    (typename: string) =>
      manager.context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {},
    [manager],
  );

  const filter = useMemo(
    () =>
      Filter.or(
        ...(db?.schemaRegistry.query({ location: ['database', 'runtime'] }).runSync() ?? [])
          .filter((schema) => getTypeAnnotation(schema)?.kind !== EntityKind.Relation)
          .filter((schema) => !SystemTypeAnnotation.get(schema).pipe(Option.getOrElse(() => false)))
          .map((schema) => Filter.typename(Type.getTypename(schema))),
      ),
    [db],
  );

  const handleLinkQuery = useCallback(
    async (query?: string): Promise<EditorMenuGroup[]> => {
      const name = query?.startsWith('@') ? query.slice(1).toLowerCase() : (query?.toLowerCase() ?? '');
      const results = await db?.query(Query.select(filter)).run();

      // TODO(wittjosiah): Use `Obj.Any` type.
      const getLabel = (object: any) => {
        const label = Obj.getLabel(object);
        if (label) {
          return label;
        }

        // TODO(wittjosiah): Remove metadata labels.
        const type = Obj.getTypename(object)!;
        const metadata = resolve(type);
        return metadata.label?.(object) || ['object name placeholder', { ns: type, default: 'New object' }];
      };

      const items =
        results
          ?.filter((object) => toLocalizedString(getLabel(object), t).toLowerCase().includes(name))
          // TODO(wittjosiah): Remove `any` type.
          .map((object: any): EditorMenuItem => {
            const metadata = resolve(Obj.getTypename(object)!);
            const label = toLocalizedString(getLabel(object), t);
            return {
              id: object.id,
              label,
              icon: metadata.icon,
              onSelect: ({ view, head }) => {
                const link = `[${label}](${Obj.getDXN(object)})`;
                if (query?.startsWith('@')) {
                  insertAtLineStart(view, head, `!${link}\n`);
                } else {
                  insertAtCursor(view, head, `${link} `);
                }
              },
            };
          }) ?? [];

      return [{ id: 'echo', items }];
    },
    [db, filter, resolve],
  );

  return handleLinkQuery;
};
