//
// Copyright 2024 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { Capabilities, useCapabilities, usePluginManager } from '@dxos/app-framework';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type PopoverMenuGroup, type PopoverMenuItem, insertAtCursor, insertAtLineStart } from '@dxos/react-ui-editor';

export const useLinkQuery = (space: Space | undefined) => {
  const { t } = useTranslation();

  const manager = usePluginManager();
  const resolve = useCallback(
    (typename: string) =>
      manager.context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {},
    [manager],
  );

  const objectForms = useCapabilities(SpaceCapabilities.ObjectForm);
  const schemaWhiteList = useCapabilities(ClientCapabilities.SchemaWhiteList);
  const filter = useMemo(
    () =>
      Filter.or(
        ...objectForms.map((form) => Filter.type(form.objectSchema)),
        ...schemaWhiteList.flat().map((schema) => Filter.typename(Type.getTypename(schema))),
      ),
    [objectForms, schemaWhiteList],
  );

  const handleLinkQuery = useCallback(
    async (query?: string): Promise<PopoverMenuGroup[]> => {
      const name = query?.startsWith('@') ? query.slice(1).toLowerCase() : (query?.toLowerCase() ?? '');
      const results = await space?.db.query(Query.select(filter)).run();

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
        results?.objects
          .filter((object) => toLocalizedString(getLabel(object), t).toLowerCase().includes(name))
          // TODO(wittjosiah): Remove `any` type.
          .map((object: any): PopoverMenuItem => {
            const metadata = resolve(Obj.getTypename(object)!);
            const label = toLocalizedString(getLabel(object), t);
            return {
              id: object.id,
              label,
              icon: metadata.icon,
              onSelect: (view, head) => {
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
    [space, filter, resolve],
  );

  return handleLinkQuery;
};
