//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Space } from '@dxos/client/echo';
import * as Dialog from '@dxos/react-ui/Dialog';

import { useSpaceName } from '../../components/SpaceMenu/index.ts';

/** The subject of the space plugin's members article, which shows the workspace's space. */
const MEMBERS = 'org.dxos.plugin.space.members';

export type ShareDialogProps = {
  space: Space;
  onClose: () => void;
};

/** The space plugin's members article in a dialog (spec F-5): the members, the open invitations, and new ones. */
export const ShareDialog = ({ space, onClose }: ShareDialogProps) => {
  const name = useSpaceName(space);
  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()}>
      <Dialog.Content data-testid='diagram-app.share-dialog'>
        <Dialog.Header>
          <Dialog.Title>Share “{name}”</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body>
          <Surface.Surface type={AppSurface.Article} data={{ subject: MEMBERS }} limit={1} />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
