//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { DeckCapabilities, DeckOperation } from '@dxos/plugin-deck';
import { useObject } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';

import { Lightbox } from '#components';
import { meta } from '#meta';
import { type Gallery } from '#types';

import { getGalleryShowPath } from '../../paths';

export type GalleryShowProps = {
  gallery: Gallery.Gallery;
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
    const objectPath = Paths.getObjectPathFromObject(subject);
    const showId = getGalleryShowPath(objectPath);
    const db = Obj.getDatabase(subject);
    if (deck?.fullscreen) {
      // Match the ID used to enter fullscreen (see GalleryArticle.handleShow / app-graph-builder).
      await invokePromise(DeckOperation.Adjust, { type: 'solo--fullscreen' as const, id: showId });
    }
    await invokePromise(LayoutOperation.Open, {
      subject: [objectPath],
      workspace: db ? Paths.getSpacePath(db.spaceId) : undefined,
    });
  }, [subject, deck, invokePromise]);

  return (
    <div className='relative w-full h-full bg-attention-surface'>
      <Lightbox.Root gallery={gallery}>
        <Lightbox.Viewport />
      </Lightbox.Root>
      <div className='absolute top-4 right-4 z-[200]'>
        <Button onClick={() => void handleExit()}>{t('exit-show.label')}</Button>
      </div>
    </div>
  );
};
