//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DialogContentProps, Dialog, useId } from '@dxos/aurora';

import { DevicesPanel, DevicesPanelProps } from '../../panels';

export interface DevicesDialogProps
  extends Omit<DialogContentProps, 'children'>,
    Omit<DevicesPanelProps, 'doneActionParent'> {}

export const DevicesDialog = ({ ...devicesDialogProps }: DevicesDialogProps) => {
  const titleId = useId('spaceDialog__title');
  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => open || devicesDialogProps.onDone?.()}>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content aria-labelledby={titleId} onOpenAutoFocus={(e) => e.preventDefault()}>
            <DevicesPanel
              {...{
                ...devicesDialogProps,
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
