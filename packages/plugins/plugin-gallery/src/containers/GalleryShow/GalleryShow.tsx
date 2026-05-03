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
import { useObject } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';

import { GalleryImage, Lightbox, type LightboxTileProps } from '#components';
import { meta } from '#meta';
import { type Gallery } from '#types';

import { useImageUrl } from '../../hooks';

export type GalleryShowProps = {
  gallery: Gallery.Gallery;
};

const ResolvingTile = ({ image }: LightboxTileProps) => {
  const url = useImageUrl(image.url, image.type);
  return <GalleryImage image={image} url={url} />;
};

export const GalleryShow = ({ gallery: subject }: GalleryShowProps) => {
  const { t } = useTranslation(meta.id);
  const [gallery] = useObject(subject);
  const stateAtom = useCapability(DeckCapabilities.State);
  const state = useAtomValue(stateAtom);
  const deck = useMemo(() => state.decks[state.activeDeck], [state.decks, state.activeDeck]);
  const { invokePromise } = useOperationInvoker();

  const handleExit = useCallback(async () => {
    if (!invokePromise) {
      return;
    }
    const objectPath = getObjectPathFromObject(subject);
    const db = Obj.getDatabase(subject);
    if (deck?.fullscreen) {
      await invokePromise(DeckOperation.Adjust, { type: 'solo--fullscreen' as const, id: objectPath });
    }
    await invokePromise(LayoutOperation.Open, {
      subject: [objectPath],
      workspace: db ? getSpacePath(db.spaceId) : undefined,
    });
  }, [subject, deck, invokePromise]);

  return (
    <div className='relative w-full h-full bg-attention-surface'>
      <Lightbox.Root gallery={gallery as unknown as Gallery.Gallery} Tile={ResolvingTile}>
        <Lightbox.Viewport />
      </Lightbox.Root>
      <div className='absolute top-4 right-4 z-[200]'>
        <Button onClick={() => void handleExit()}>{t('exit-show.label')}</Button>
      </div>
    </div>
  );
};
