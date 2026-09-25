//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Annotation, Collection, Filter, Obj, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { useSpace } from '@dxos/react-client/echo';
import { Dialog, DIALOG_AUTOFOCUS_ATTRIBUTE, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

const COLLECTION_ICON = 'ph--folder--regular';

export type AddToCollectionDialogProps = {
  object: Obj.Unknown;
};

type CollectionItem = {
  id: string;
  collection: Collection.Collection;
  label: string;
  /** The collection it sits in, to tell apart collections with the same name. */
  parentLabel?: string;
  /** Already lists the object. */
  listed: boolean;
};

/** Picks a collection in the object's space to list the object in. */
export const AddToCollectionDialog = ({ object }: AddToCollectionDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(object);
  const space = useSpace(db?.spaceId);
  const collections = useQuery(db, Filter.type(Collection.Collection));
  const listing = useQuery(db, ContainerModel.containing(object));

  const items = useMemo<CollectionItem[]>(() => {
    const rootId = space
      ? Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)?.peek()?.id
      : undefined;
    const listed = new Set(listing.map((collection) => collection.id));
    const excluded = Collection.isCollection(object) ? getSubtree(object, collections) : new Set<string>();
    const getLabel = (collection: Collection.Collection) =>
      collection.id === rootId
        ? toLocalizedString(['collections-section.label', { ns: meta.profile.key }], t)
        : (Obj.getLabel(collection) ??
          toLocalizedString(
            ['object-name.placeholder', { ns: Type.getTypename(Collection.Collection), defaultValue: collection.id }],
            t,
          ));

    return collections
      .filter((collection) => !excluded.has(collection.id))
      .map((collection) => {
        const parent = Obj.getParent(collection);
        return {
          id: collection.id,
          collection,
          label: getLabel(collection),
          parentLabel: Collection.isCollection(parent) ? getLabel(parent) : undefined,
          listed: listed.has(collection.id),
        };
      })
      .sort((a, b) => (a.id === rootId ? -1 : b.id === rootId ? 1 : a.label.localeCompare(b.label)));
  }, [object, space, collections, listing, t]);

  const { results, handleSearch } = useSearchListResults({ items, extract: (item) => item.label });

  const handleSelect = useCallback(
    async (collection: Collection.Collection) => {
      const { error } = await invokePromise(
        SpaceOperation.AddObject,
        { object, target: collection },
        { spaceId: db?.spaceId },
      );
      if (error) {
        // Stays open, so the user can pick another collection or dismiss it knowing nothing changed.
        log.warn('failed to add to collection', { error });
        await invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.add-to-collection-failed`,
          icon: 'ph--warning--regular',
          title: ['add-to-collection-failed.title', { ns: meta.profile.key }],
          description: error.message,
        });
        return;
      }
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
    },
    [invokePromise, object, db],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('add-to-collection-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <SearchList.Root onSearch={handleSearch} resetSelectionOnChange>
          <SearchList.Input
            classNames='px-0'
            autoFocus
            escapeBehavior='dismiss'
            placeholder={t('add-to-collection-dialog.placeholder')}
            {...{ [DIALOG_AUTOFOCUS_ATTRIBUTE]: '' }}
          />
          <SearchList.Viewport classNames='max-h-[24rem]'>
            {results.length === 0 && <SearchList.Empty />}
            {results.map((item) => (
              <SearchList.Item
                key={item.id}
                value={item.id}
                label={item.label}
                icon={COLLECTION_ICON}
                suffix={item.parentLabel}
                checked={item.listed}
                disabled={item.listed}
                onSelect={() => void handleSelect(item.collection)}
              />
            ))}
          </SearchList.Viewport>
        </SearchList.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};

AddToCollectionDialog.displayName = 'AddToCollectionDialog';

/**
 * The collection and every collection beneath it, which it cannot be listed in without a cycle. Walks
 * ref ids against the queried collections, so an unloaded ref still counts.
 */
const getSubtree = (root: Collection.Collection, collections: readonly Collection.Collection[]): Set<string> => {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const ids = new Set<string>();
  const visit = (collection: Collection.Collection | undefined) => {
    if (!collection || ids.has(collection.id)) {
      return;
    }
    ids.add(collection.id);
    for (const ref of collection.objects) {
      const eid = EID.tryParse(ref.uri);
      const id = eid && EID.getEntityId(eid);
      visit(id ? byId.get(id) : undefined);
    }
  };
  visit(root);
  return ids;
};
