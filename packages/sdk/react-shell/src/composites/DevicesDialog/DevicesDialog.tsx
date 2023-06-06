//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DialogContentProps, Dialog, ThemeContext, useId, useThemeContext } from '@dxos/aurora';
import { osTx } from '@dxos/aurora-theme';

import { DevicesPanel, DevicesPanelProps } from '../../panels';

export interface DevicesDialogProps
  extends Omit<DialogContentProps, 'children'>,
    Omit<DevicesPanelProps, 'doneActionParent'> {}

export const DevicesDialog = ({ ...devicesDialogProps }: DevicesDialogProps) => {
  const titleId = useId('spaceDialog__title');
  const themeContextValue = useThemeContext();

  return (
    <ThemeContext.Provider value={{ ...themeContextValue, tx: osTx }}>
      <Dialog.Root defaultOpen onOpenChange={(open) => open || devicesDialogProps.onDone?.()}>
        <Dialog.Portal>
          <Dialog.Overlay>
            <Dialog.Content>
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
    </ThemeContext.Provider>
  );
};
