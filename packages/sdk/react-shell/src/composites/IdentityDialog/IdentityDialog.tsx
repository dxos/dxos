//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DialogContentProps, Dialog, useId } from '@dxos/aurora';

import { IdentityPanel, IdentityPanelProps } from '../../panels';

export interface IdentityDialogProps
  extends Omit<DialogContentProps, 'children'>,
    Omit<IdentityPanelProps, 'doneActionParent'> {
  onDone: () => void;
}

export const IdentityDialog = (props: IdentityDialogProps) => {
  const titleId = useId('spaceDialog__title');
  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => open || props.onDone?.()}>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content aria-labelledby={titleId} onOpenAutoFocus={(e) => e.preventDefault()}>
            <IdentityPanel
              {...{
                ...props,
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
