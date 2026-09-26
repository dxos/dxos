//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Annotation, Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { ArchivedAnnotation, isArchivable } from '@dxos/schema';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

export type ArchiveMenuItem = { label: string; icon: string; onClick: () => void };

// TODO(wittjosiah): Derive card menu items from the object's app-graph actions instead of per-card hooks.
/**
 * The object's live archive state, and a card menu item that toggles it; the item is undefined when
 * the object's type is not archivable or the object is not persisted.
 */
export const useArchiveMenuItem = (object: Obj.Unknown): { archived: boolean; item?: ArchiveMenuItem } => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const archivable = isArchivable(object) && Obj.getDatabase(object) !== undefined;
  const archived = Option.getOrElse(
    useAtomValue(useMemo(() => Annotation.atom(object, ArchivedAnnotation), [object])),
    () => false,
  );

  const item = useMemo(
    () =>
      archivable
        ? {
            label: t(archived ? 'unarchive-object.label' : 'archive-object.label'),
            icon: archived ? 'ph--tray-arrow-up--regular' : 'ph--archive--regular',
            onClick: () => void invokePromise(SpaceOperation.SetArchived, { objects: [object], archived: !archived }),
          }
        : undefined,
    [t, invokePromise, object, archivable, archived],
  );

  return { archived, item };
};
