//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  DialogClose,
  DialogContent,
  DialogContentProps,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  ThemeContext,
  useId,
  useThemeContext,
} from '@dxos/aurora';
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
      <DialogRoot defaultOpen onOpenChange={(open) => open || devicesDialogProps.onDone?.()}>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent>
              <DevicesPanel
                {...{
                  ...devicesDialogProps,
                  titleId,
                  doneActionParent: <DialogClose asChild />,
                }}
              />
            </DialogContent>
          </DialogOverlay>
        </DialogPortal>
      </DialogRoot>
    </ThemeContext.Provider>
  );
};
