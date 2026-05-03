//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { linkedSegment } from '@dxos/react-ui-attention';
import { type ActionGraphProps, Menu, MenuBuilder, useMenuActions } from '@dxos/react-ui-menu';

import { GalleryImage, Lightbox, type LightboxTileProps } from '#components';
import { meta } from '#meta';
import { Gallery } from '#types';

import { useFileUpload, useImageUrl } from '../../hooks';
import { GALLERY_SHOW_SEGMENT } from '../../paths';

export type GalleryArticleProps = AppSurface.ObjectArticleProps<Gallery.Gallery>;

/** Lightbox tile that resolves `wnfs://` URLs to blob URLs. */
const ResolvingTile = ({ image, onDelete }: LightboxTileProps) => {
  const url = useImageUrl(image.url, image.type);
  return <GalleryImage image={image} url={url} onDelete={onDelete} />;
};

export const GalleryArticle = ({ role, attendableId, subject }: GalleryArticleProps) => {
  const [gallery] = useObject(subject);
  const [deckState] = useCapabilities(DeckCapabilities.State);
  const { invokePromise } = useOperationInvoker();

  const {
    open: openFilePicker,
    enabled: canUpload,
    input: fileInput,
  } = useFileUpload({
    subject,
    accept: 'image/*',
    onUpload: async (info, file) => {
      const { width, height } = await loadImageDimensions(file);
      Obj.change(subject, (subject) => {
        const mutable = subject as Obj.Mutable<Gallery.Gallery>;
        const next = [...(mutable.images ?? [])];
        next.push({ url: info.url, type: info.type, name: info.name, width, height });
        mutable.images = next;
      });
    },
  });

  const handleDelete = useCallback(
    (index: number) => {
      Obj.change(subject, (subject) => {
        const mutable = subject as Obj.Mutable<Gallery.Gallery>;
        const next = [...(mutable.images ?? [])];
        next.splice(index, 1);
        mutable.images = next;
      });
    },
    [subject],
  );

  const handleShow = useCallback(async () => {
    const db = Obj.getDatabase(subject);
    if (!db || !invokePromise) {
      return;
    }
    const objectPath = getObjectPathFromObject(subject);
    const showId = `${objectPath}/${linkedSegment(GALLERY_SHOW_SEGMENT)}`;
    await invokePromise(DeckOperation.Adjust, { type: 'solo--fullscreen' as const, id: showId });
    await invokePromise(LayoutOperation.Open, { subject: [showId], workspace: getSpacePath(db.spaceId) });
  }, [subject, invokePromise]);

  const actionsAtom = useMemo(
    () =>
      Atom.make(
        (): ActionGraphProps =>
          MenuBuilder.make()
            .action(
              'add',
              {
                label: ['add-image.label', { ns: meta.id }],
                icon: 'ph--plus--regular',
                disabled: !canUpload,
                disposition: 'toolbar',
                testId: 'gallery.toolbar.add',
              },
              () => openFilePicker(),
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
    [canUpload, deckState, openFilePicker, handleShow],
  );

  const menuActions = useMenuActions(actionsAtom);

  return (
    <Lightbox.Root gallery={gallery} onDelete={handleDelete} Tile={ResolvingTile}>
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Panel.Root role={role}>
          <Panel.Toolbar asChild>
            <Menu.Toolbar />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <Lightbox.Viewport />
          </Panel.Content>
        </Panel.Root>
      </Menu.Root>
      {fileInput}
    </Lightbox.Root>
  );
};

type ImageDimensions = {
  width?: number;
  height?: number;
};

const loadImageDimensions = async (file: File): Promise<ImageDimensions> => {
  if (!file.type.startsWith('image/')) {
    return {};
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    const dimensions = await new Promise<ImageDimensions>((resolve) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({});
      img.src = url;
    });

    return dimensions;
  } finally {
    URL.revokeObjectURL(url);
  }
};
