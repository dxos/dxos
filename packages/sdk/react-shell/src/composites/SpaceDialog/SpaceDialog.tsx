//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Dialog, DialogContentProps, ThemeContext, useId, useThemeContext } from '@dxos/aurora';
import { osTx } from '@dxos/aurora-theme';

import { SpacePanel, SpacePanelProps } from '../../panels';

export interface SpaceDialogProps
  extends Omit<DialogContentProps, 'children'>,
    Omit<SpacePanelProps, 'doneActionParent'> {}

export const SpaceDialog = ({ ...spacePanelProps }: SpaceDialogProps) => {
  const titleId = useId('spaceDialog__title');
  const themeContextValue = useThemeContext();

  return (
    <ThemeContext.Provider value={{ ...themeContextValue, tx: osTx }}>
      <Dialog.Root defaultOpen onOpenChange={(open) => open || spacePanelProps.onDone?.()}>
        <Dialog.Portal>
          <Dialog.Overlay>
            <Dialog.Content>
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
    </ThemeContext.Provider>
  );
};
