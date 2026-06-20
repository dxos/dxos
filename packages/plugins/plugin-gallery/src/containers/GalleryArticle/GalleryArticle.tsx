//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { DeckCapabilities, DeckOperation } from '@dxos/plugin-deck';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { Lightbox } from '#components';
import { meta } from '#meta';
import { Gallery } from '#types';

import { useFileUpload } from '../../hooks';
import { getGalleryShowPath } from '../../paths';

export type GalleryArticleProps = AppSurface.ObjectArticleProps<Gallery.Gallery>;

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
    onUpload: async (uploaded) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as Obj.Mutable<Gallery.Gallery>;
        mutable.images = [...(mutable.images ?? []), Ref.make(uploaded)];
      });
    },
  });

  const handleDelete = useCallback(
    (index: number) => {
      Obj.update(subject, (subject) => {
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
    const objectPath = Paths.getObjectPathFromObject(subject);
    const showId = getGalleryShowPath(objectPath);
    await invokePromise(DeckOperation.Adjust, { type: 'solo--fullscreen' as const, id: showId });
    await invokePromise(LayoutOperation.Open, { subject: [showId], workspace: Paths.getSpacePath(db.spaceId) });
  }, [subject, invokePromise]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'add',
          {
            label: ['add-image.label', { ns: meta.profile.key }],
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
            label: ['show.label', { ns: meta.profile.key }],
            icon: 'ph--play--regular',
            disabled: !deckState,
            disposition: 'toolbar',
            testId: 'gallery.toolbar.show',
          },
          () => void handleShow(),
        )
        .build(),
    [canUpload, deckState, openFilePicker, handleShow],
  );

  return (
    <Lightbox.Root gallery={gallery} onDelete={handleDelete}>
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
