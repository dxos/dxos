//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client/echo';
import * as AlertDialog from '@dxos/react-ui/AlertDialog';

import { useSpaceName } from './SpaceMenu.tsx';

export type DeleteSpaceDialogProps = {
  space: Space;
  onDelete: (space: Space) => void;
  onClose: () => void;
};

/** Asks before a space is deleted (spec F-3.7), since the deletion reaches every device and member. */
export const DeleteSpaceDialog = ({ space, onDelete, onClose }: DeleteSpaceDialogProps) => {
  const name = useSpaceName(space);
  return (
    <AlertDialog.Root open onOpenChange={({ open }) => !open && onClose()}>
      <AlertDialog.Content data-testid='diagram-app.delete-space-dialog'>
        <AlertDialog.Body>
          <AlertDialog.Title>Delete “{name}”?</AlertDialog.Title>
          <AlertDialog.Description>
            The space and every diagram in it are deleted on all your devices. This cannot be undone.
          </AlertDialog.Description>
        </AlertDialog.Body>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action
            variant='destructive'
            data-testid='diagram-app.delete-space-confirm'
            onClick={() => onDelete(space)}
          >
            Delete
          </AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};
