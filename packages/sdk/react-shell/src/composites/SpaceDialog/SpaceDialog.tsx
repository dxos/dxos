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

import { SpacePanel, SpacePanelProps } from '../../panels';

export interface SpaceDialogProps
  extends Omit<DialogContentProps, 'children'>,
    Omit<SpacePanelProps, 'doneActionParent'> {}

export const SpaceDialog = ({ ...spacePanelProps }: SpaceDialogProps) => {
  const titleId = useId('spaceDialog__title');
  const themeContextValue = useThemeContext();

  return (
    <ThemeContext.Provider value={{ ...themeContextValue, tx: osTx }}>
      <DialogRoot defaultOpen onOpenChange={(open) => open || spacePanelProps.onDone?.()}>
        <DialogPortal>
          <DialogOverlay>
            <DialogContent>
              <SpacePanel
                {...{
                  ...spacePanelProps,
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
