//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Collection, Obj, Ref } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { Icon, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useListSelection } from '@dxos/react-ui-list';
import { Masonry } from '@dxos/react-ui-masonry';

import { GalleryImage } from '#components';
import { meta } from '#meta';
import { Artifact } from '#types';

import { useArtifactCoverSource } from '../../hooks';

const isArtifact = Obj.instanceOf(Artifact.Artifact);

type TileData = {
  artifact: Obj.Snapshot<Artifact.Artifact>;
  index: number;
};

const ArtifactTile = ({ data, selected }: { data?: TileData; selected?: boolean }) => {
  const src = useArtifactCoverSource(data?.artifact);
  if (!data) {
    return null;
  }
  return (
    <div className='relative'>
      <GalleryImage src={src} alt={data.artifact.name} />
      {selected && <Icon icon='ph--check-circle--fill' size={6} classNames='absolute top-1 right-1 text-primary-500' />}
    </div>
  );
};

export type GalleryArticleProps = AppSurface.ObjectArticleProps<Collection.Collection>;

/**
 * Article surface for a masonry gallery: a `Collection` of {@link Artifact}s rendered as thumbnails.
 * The toolbar creates a new Artifact (added to the collection and opened) and deletes the
 * multi-selected ones. Selection state is owned here via `useListSelection` (multi); the masonry
 * renders the outline and emits tile clicks.
 */
export const GalleryArticle = ({ role, subject: collection }: GalleryArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(collection);

  const [collectionSnapshot] = useObject(collection);
  const objectRefs = collectionSnapshot?.objects ?? [];
  const objects = useObjects(objectRefs);
  const items = useMemo(
    () =>
      objects
        .filter((object): object is Obj.Snapshot<Artifact.Artifact> => isArtifact(object))
        .map((artifact, index) => ({ artifact, index })),
    [objects],
  );

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const { bind } = useListSelection({ mode: 'multi', value: selectedIds, onValueChange: setSelectedIds });

  // Create a new Artifact owned by (parented to) the collection, then open it to author.
  const handleCreate = useCallback(async () => {
    if (!db) {
      return;
    }
    const artifact = Artifact.make();
    Obj.setParent(artifact, collection);
    db.add(artifact);
    Obj.update(collection, (collection) => {
      collection.objects = [...(collection.objects ?? []), Ref.make(artifact)];
    });
    await invokePromise(LayoutOperation.Open, { subject: [Paths.getObjectPathFromObject(artifact)] });
  }, [db, collection, invokePromise]);

  const handleDelete = useCallback(() => {
    if (!db || selectedIds.size === 0) {
      return;
    }
    const remaining: Ref.Ref<Obj.Unknown>[] = [];
    const removed: Obj.Unknown[] = [];
    for (const ref of collection.objects ?? []) {
      const target = ref.target;
      if (target && selectedIds.has(target.id)) {
        removed.push(target);
      } else {
        remaining.push(ref);
      }
    }
    Obj.update(collection, (collection) => {
      collection.objects = remaining;
    });
    for (const object of removed) {
      db.remove(object);
    }
    setSelectedIds(new Set());
  }, [db, collection, selectedIds]);

  const handleSelect = useCallback((id: string, _event: MouseEvent) => bind(id).toggle(), [bind]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton
            icon='ph--plus--regular'
            label={t('create.label')}
            disabled={!db}
            onClick={() => void handleCreate()}
          />
          <IconButton
            icon='ph--trash--regular'
            label={t('delete-variant.label')}
            disabled={selectedIds.size === 0}
            onClick={handleDelete}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        {items.length === 0 ? (
          <div role='status' className='flex items-center justify-center bs-full text-subdued'>
            {t('empty.message')}
          </div>
        ) : (
          <Masonry.Root Tile={ArtifactTile}>
            <Masonry.Content centered>
              <Masonry.Viewport
                items={items}
                getId={(data?: TileData) => data?.artifact.id ?? String(data?.index ?? '')}
                selectedIds={selectedIds}
                onSelect={handleSelect}
              />
            </Masonry.Content>
          </Masonry.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

GalleryArticle.displayName = 'GalleryArticle';
