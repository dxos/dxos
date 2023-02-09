//
// Copyright 2023 DXOS.org
//

import { Close } from '@radix-ui/react-dialog';
import React from 'react';

import { ThemeContext, useId } from '@dxos/react-components';

import { PanelDialog, PanelDialogProps } from '../../layouts';
import { DevicesPanel, DevicesPanelProps } from '../../panels';

export interface DevicesDialogProps
  extends Omit<PanelDialogProps, 'titleId' | 'children'>,
    Omit<DevicesPanelProps, 'doneActionParent'> {}

export const DevicesDialog = ({ slots, ...devicesDialogProps }: DevicesDialogProps) => {
  const titleId = useId('spaceDialog__title');

  return (
    <PanelDialog
      {...{
        slots: { ...slots, root: { onOpenChange: (open) => open || devicesDialogProps.onDone?.(), ...slots?.root } },
        titleId
      }}
    >
      <ThemeContext.Provider value={{ themeVariant: 'os' }}>
        <DevicesPanel
          {...{
            ...devicesDialogProps,
            titleId,
            doneActionParent: <Close asChild />
          }}
        />
      </ThemeContext.Provider>
    </PanelDialog>
  );
};
