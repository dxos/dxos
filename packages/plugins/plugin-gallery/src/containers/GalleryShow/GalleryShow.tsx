//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { Button, Panel, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { GalleryImage } from '#components';
import { meta } from '#meta';
import { type Gallery } from '#types';

export type GalleryShowProps = {
  gallery: Gallery.Gallery;
};

export const GalleryShow = ({ gallery }: GalleryShowProps) => {
  const { t } = useTranslation(meta.id);
  const stateAtom = useCapability(DeckCapabilities.State);
  const state = useAtomValue(stateAtom);
  const deck = useMemo(() => state.decks[state.activeDeck], [state.decks, state.activeDeck]);
  const { invokePromise } = useOperationInvoker();

  const handleExit = useCallback(async () => {
    if (!invokePromise) {
      return;
    }
    const objectPath = getObjectPathFromObject(gallery);
    const db = Obj.getDatabase(gallery);
    if (deck?.fullscreen) {
      await invokePromise(DeckOperation.Adjust, {
        type: 'solo--fullscreen' as const,
        id: objectPath,
      });
    }
    await invokePromise(LayoutOperation.Open, {
      subject: [objectPath],
      workspace: db ? getSpacePath(db.spaceId) : undefined,
    });
  }, [gallery, deck, invokePromise]);

  const items = useMemo(() => (gallery.images ?? []).map((image, index) => ({ image, index })), [gallery.images]);

  return (
    <Panel.Root role='article' classNames='relative bg-attention-surface'>
      <Panel.Content asChild>
        <div className='relative w-full h-full'>
          <Masonry.Root
            Tile={({ data }: { data: { image: Gallery.Image; index: number } }) => <GalleryImage image={data.image} />}
          >
            <Masonry.Content padding>
              <Masonry.Viewport
                items={items}
                getId={(data: { image: Gallery.Image; index: number }) => `${data.index}:${data.image.url}`}
              />
            </Masonry.Content>
          </Masonry.Root>
          <div className='absolute top-4 right-4 z-[200]'>
            <Button onClick={() => void handleExit()}>{t('exit-show.label')}</Button>
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
