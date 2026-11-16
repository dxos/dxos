//
// Copyright 2026 DXOS.org
//

import React, { Suspense } from 'react';

import { type Space } from '@dxos/client/echo';
import * as Containers from '@dxos/plugin-space/Containers';
import * as Dialog from '@dxos/react-ui/Dialog';

import { useSpaceName } from '../../components/SpaceMenu/index.ts';
import { invitationUrl } from '../../util/index.ts';

export type ShareDialogProps = {
  space: Space;
  onClose: () => void;
};

/** Composer's members panel in a dialog (spec F-5): the members, the open invitations, and new ones. */
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
          {/* The panel is a lazy chunk (Composer's forms and shell), loaded when Share is first pressed. */}
          <Suspense>
            <Containers.MembersContainer
              space={space}
              attendableId={space.id}
              createInvitationUrl={invitationUrl}
              heading={false}
            />
          </Suspense>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
