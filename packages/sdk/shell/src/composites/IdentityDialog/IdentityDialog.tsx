//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type DialogContentProps, Dialog, useId } from '@dxos/react-ui';

import { ClipboardProvider } from '../../components';
import { IdentityPanel, type IdentityPanelProps } from '../../panels';

export interface IdentityDialogProps
  extends Omit<DialogContentProps, 'children'>,
    Omit<IdentityPanelProps, 'doneActionParent'> {
  onDone: () => void;
}

export const IdentityDialog = (props: IdentityDialogProps) => {
  const titleId = useId('identityDialog__title', props.title);
  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => open || props.onDone?.()}>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content aria-labelledby={titleId} onOpenAutoFocus={(e) => e.preventDefault()}>
            <ClipboardProvider>
              <IdentityPanel
                {...{
                  ...props,
                  titleId,
                  doneActionParent: <Dialog.Close asChild />,
                }}
              />
            </ClipboardProvider>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
