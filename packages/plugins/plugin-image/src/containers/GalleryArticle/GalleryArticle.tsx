//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Icon, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useListSelection } from '@dxos/react-ui-list';
import { Masonry } from '@dxos/react-ui-masonry';

import { GalleryImage } from '#components';
import { meta } from '#meta';
import { type Gallery, type Image, ImageArtifact } from '#types';

import { useImageSource } from '../../hooks';

export type GalleryArticleProps = AppSurface.ObjectArticleProps<Gallery.Gallery>;

type TileData = { artifact: Obj.Snapshot<ImageArtifact.ImageArtifact>; index: number };

/** Resolve an ImageArtifact's thumbnail: the source of its first generated/uploaded Image. */
const useArtifactThumbnail = (artifact?: Obj.Snapshot<ImageArtifact.ImageArtifact>): string | undefined => {
  const firstRef = artifact?.images?.[0];
  const key = firstRef?.uri;
  const [image, setImage] = useState<Image.Image>();
  useEffect(() => {
    if (!firstRef) {
      setImage(undefined);
      return;
    }
    let cancelled = false;
    void firstRef
      .load()
      .then((loaded) => {
        if (!cancelled) {
          setImage(loaded);
        }
      })
      .catch((err) => log.catch(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return useImageSource(image);
};

const ArtifactTile = ({ data, selected }: { data?: TileData; selected?: boolean }) => {
  const src = useArtifactThumbnail(data?.artifact);
  if (!data) {
    return null;
  }
  return (
    <div className='relative'>
      <GalleryImage src={src} alt={data.artifact.name} />
      {selected && (
        <Icon
          icon='ph--check-circle--fill'
          size={6}
          classNames='absolute block-start-1 inline-end-1 text-primary-500 bg-baseSurface rounded-full'
        />
      )}
    </div>
  );
};

/**
 * Article surface for a Gallery: a masonry of its owned ImageArtifacts (rendered as thumbnails). The
 * toolbar creates a new empty ImageArtifact (added to the gallery and opened) and deletes the
 * multi-selected ones. Selection state is owned here via `useListSelection` (multi); the masonry
 * renders the outline and emits tile clicks.
 */
export const GalleryArticle = ({ role, subject: gallery }: GalleryArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(gallery);

  const [gallerySnapshot] = useObject(gallery);
  const artifactRefs = gallerySnapshot?.images ?? [];
  const artifacts = useObjects(artifactRefs);
  const items = useMemo(() => artifacts.map((artifact, index) => ({ artifact, index })), [artifacts]);

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const { bind } = useListSelection({ mode: 'multi', value: selectedIds, onValueChange: setSelectedIds });

  // Create a new empty ImageArtifact owned by (parented to) the gallery, then open it to author.
  const handleCreate = useCallback(async () => {
    if (!db) {
      return;
    }
    const artifact = ImageArtifact.make();
    Obj.setParent(artifact, gallery);
    db.add(artifact);
    Obj.update(gallery, (gallery) => {
      gallery.images = [...(gallery.images ?? []), Ref.make(artifact)];
    });
    await invokePromise(LayoutOperation.Open, { subject: [Paths.getObjectPathFromObject(artifact)] });
  }, [db, gallery, invokePromise]);

  const handleDelete = useCallback(() => {
    if (!db || selectedIds.size === 0) {
      return;
    }
    const remaining: Ref.Ref<ImageArtifact.ImageArtifact>[] = [];
    const removed: ImageArtifact.ImageArtifact[] = [];
    for (const ref of gallery.images ?? []) {
      const target = ref.target;
      if (target && selectedIds.has(target.id)) {
        removed.push(target);
      } else {
        remaining.push(ref);
      }
    }
    Obj.update(gallery, (gallery) => {
      gallery.images = remaining;
    });
    for (const artifact of removed) {
      db.remove(artifact);
    }
    setSelectedIds(new Set());
  }, [db, gallery, selectedIds]);

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
            label={t('delete-image.label')}
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
