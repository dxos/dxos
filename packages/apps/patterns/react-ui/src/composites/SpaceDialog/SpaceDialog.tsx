//
// Copyright 2023 DXOS.org
//

import { Close } from '@radix-ui/react-dialog';
import React from 'react';

import { ThemeContext, useId, useThemeContext } from '@dxos/react-components';

import { Dialog, DialogProps } from '../../layouts';
import { SpacePanel, SpacePanelProps } from '../../panels';

export interface SpaceDialogProps
  extends Omit<DialogProps, 'titleId' | 'children'>,
    Omit<SpacePanelProps, 'doneActionParent'> {}

export const SpaceDialog = ({ slots, ...spacePanelProps }: SpaceDialogProps) => {
  const titleId = useId('spaceDialog__title');
  const themeContextValue = useThemeContext();

  return (
    <Dialog
      {...{
        slots: { ...slots, root: { onOpenChange: (open) => open || spacePanelProps.onDone?.(), ...slots?.root } },
        titleId
      }}
    >
      <ThemeContext.Provider value={{ ...themeContextValue, themeVariant: 'os' }}>
        <SpacePanel
          {...{
            ...spacePanelProps,
            titleId,
            doneActionParent: <Close asChild />
          }}
        />
      </ThemeContext.Provider>
    </Dialog>
  );
};
