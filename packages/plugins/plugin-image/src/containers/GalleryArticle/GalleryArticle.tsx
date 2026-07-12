//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useListSelection } from '@dxos/react-ui-list';
import { type File } from '@dxos/types';

import { ImageGallery, type ImageSource } from '#components';
import { meta } from '#meta';
import { type Gallery, Image } from '#types';

import { useFileUpload } from '../../hooks';

export type GalleryArticleProps = AppSurface.ObjectArticleProps<Gallery.Gallery>;

/**
 * Article surface for a Gallery: a masonry of its owned images with a toolbar to add (upload) images
 * and delete the multi-selected ones. Selection state is owned here via `useListSelection` (multi);
 * the masonry renders the selection outline and emits tile clicks.
 */
export const GalleryArticle = ({ role, subject: gallery }: GalleryArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(gallery);

  const [gallerySnapshot] = useObject(gallery);
  const imageRefs = gallerySnapshot?.images ?? [];
  const images = useObjects(imageRefs);
  const sources = useMemo<ImageSource[]>(
    () => images.map((image) => ({ id: image.id, url: image.url, file: image.file, name: image.prompt ?? undefined })),
    [images],
  );

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const { bind } = useListSelection({ mode: 'multi', value: selectedIds, onValueChange: setSelectedIds });

  // Uploaded images become file-backed Image objects owned by (parented to) the gallery.
  const handleUpload = useCallback(
    (uploaded: File.File) => {
      if (!db) {
        return;
      }
      const image = Image.make({ file: Ref.make(uploaded) });
      Obj.setParent(image, gallery);
      db.add(image);
      Obj.update(gallery, (gallery) => {
        gallery.images = [...(gallery.images ?? []), Ref.make(image)];
      });
    },
    [db, gallery],
  );
  const upload = useFileUpload({ subject: gallery, accept: 'image/*', multiple: true, onUpload: handleUpload });

  const handleDelete = useCallback(() => {
    if (!db || selectedIds.size === 0) {
      return;
    }
    // Operate on the live gallery: partition its refs by whether the (loaded) target is selected.
    const remaining: Ref.Ref<Image.Image>[] = [];
    const removed: Image.Image[] = [];
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
    for (const image of removed) {
      db.remove(image);
    }
    setSelectedIds(new Set());
  }, [db, gallery, selectedIds]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton
            icon='ph--upload-simple--regular'
            label={t('upload.label')}
            disabled={!upload.enabled}
            onClick={() => upload.open()}
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
        <ImageGallery
          images={sources}
          emptyMessage={t('empty.message')}
          selectedIds={selectedIds}
          onSelect={(id) => bind(id).toggle()}
        />
      </Panel.Content>
      {upload.input}
    </Panel.Root>
  );
};

GalleryArticle.displayName = 'GalleryArticle';
