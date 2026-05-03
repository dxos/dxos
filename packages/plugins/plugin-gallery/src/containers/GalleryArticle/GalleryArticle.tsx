//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useCallback, useMemo, useRef } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { Panel, useTranslation } from '@dxos/react-ui';
import { linkedSegment } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';
import { type ActionGraphProps, Menu, MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';

import { GalleryImage } from '#components';
import { meta } from '#meta';
import { type Gallery } from '#types';

import { GALLERY_SHOW_SEGMENT } from '../../paths';

export type GalleryArticleProps = AppSurface.ObjectArticleProps<Gallery.Gallery>;

const IMAGE_ACCEPT = 'image/*';

export const GalleryArticle = ({ role, attendableId: _attendableId, subject: gallery }: GalleryArticleProps) => {
  const { t } = useTranslation(meta.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploader] = useCapabilities(AppCapabilities.FileUploader);
  const [deckState] = useCapabilities(DeckCapabilities.State);
  const { invokePromise } = useOperationInvoker();

  const handleAdd = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!uploader) {
        return;
      }
      const db = Obj.getDatabase(gallery);
      if (!db) {
        return;
      }
      const info = await uploader(db, file);
      if (!info?.url) {
        return;
      }
      const url = info.url;
      Obj.change(gallery, (gallery) => {
        const mutable = gallery as Obj.Mutable<Gallery.Gallery>;
        const next = [...(mutable.images ?? [])];
        next.push({ url, type: info.type, name: info.name });
        mutable.images = next;
      });
    },
    [uploader, gallery],
  );

  const handleDelete = useCallback(
    (index: number) => {
      Obj.change(gallery, (gallery) => {
        const mutable = gallery as Obj.Mutable<Gallery.Gallery>;
        const next = [...(mutable.images ?? [])];
        next.splice(index, 1);
        mutable.images = next;
      });
    },
    [gallery],
  );

  const handleShow = useCallback(async () => {
    const db = Obj.getDatabase(gallery);
    if (!db || !invokePromise) {
      return;
    }
    const objectPath = getObjectPathFromObject(gallery);
    const showId = `${objectPath}/${linkedSegment(GALLERY_SHOW_SEGMENT)}`;
    await invokePromise(DeckOperation.Adjust, {
      type: 'solo--fullscreen' as const,
      id: showId,
    });
    await invokePromise(LayoutOperation.Open, {
      subject: [showId],
      workspace: getSpacePath(db.spaceId),
    });
  }, [gallery, invokePromise]);

  // Build toolbar actions via MenuBuilder.
  const actionsAtom = useMemo(
    () =>
      Atom.make((): ActionGraphProps =>
        MenuBuilder.make()
          .action(
            'add',
            {
              label: ['add-image.label', { ns: meta.id }],
              icon: 'ph--plus--regular',
              disabled: !uploader,
              disposition: 'toolbar',
              testId: 'gallery.toolbar.add',
            },
            () => handleAdd(),
          )
          .action(
            'show',
            {
              label: ['show.label', { ns: meta.id }],
              icon: 'ph--play--regular',
              disabled: !deckState,
              disposition: 'toolbar',
              testId: 'gallery.toolbar.show',
            },
            () => void handleShow(),
          )
          .build(),
      ),
    [uploader, deckState, handleAdd, handleShow],
  );

  const menuActions = useMenuActions(actionsAtom);

  const galleryImages = (gallery as Gallery.Gallery).images ?? [];
  const items = useMemo(
    () => galleryImages.map((image, index) => ({ image, index })),
    [galleryImages],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Menu.Root {...menuActions}>
          <Menu.Toolbar />
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Masonry.Root
          Tile={({ data }: { data: { image: Gallery.Image; index: number } }) => (
            <GalleryImage image={data.image} onDelete={() => handleDelete(data.index)} />
          )}
        >
          <Masonry.Content>
            <Masonry.Viewport
              items={items}
              getId={(data: { image: Gallery.Image; index: number }) => `${data.index}:${data.image.url}`}
            />
          </Masonry.Content>
        </Masonry.Root>
        {items.length === 0 && (
          <div className='flex items-center justify-center h-full text-subdued'>{t('empty.message')}</div>
        )}
      </Panel.Content>
      <input
        ref={fileInputRef}
        type='file'
        accept={IMAGE_ACCEPT}
        className='hidden'
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          event.target.value = '';
        }}
      />
    </Panel.Root>
  );
};
