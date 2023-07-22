//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Dialog, DialogContentProps, useId } from '@dxos/aurora';

import { SpacePanel, SpacePanelProps } from '../../panels';

export interface SpaceDialogProps
  extends Omit<DialogContentProps, 'children'>,
    Omit<SpacePanelProps, 'doneActionParent'> {}

export const SpaceDialog = ({ ...spacePanelProps }: SpaceDialogProps) => {
  const titleId = useId('spaceDialog__title');
  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => open || spacePanelProps.onDone?.()}>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content aria-labelledby={titleId}>
            <SpacePanel
              {...{
                ...spacePanelProps,
                titleId,
                doneActionParent: <Dialog.Close asChild />,
              }}
            />
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
