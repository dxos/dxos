//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AlertDialog, ThemeContext, AlertDialogContentProps, useId, useThemeContext } from '@dxos/aurora';
import { osTx } from '@dxos/aurora-theme';

import { JoinPanel, JoinPanelProps } from '../../panels';

export interface JoinDialogProps
  extends Omit<AlertDialogContentProps, 'children'>,
    Omit<JoinPanelProps, 'exitActionParent' | 'doneActionParent'> {}

export const JoinDialog = (joinPanelProps: JoinDialogProps) => {
  const titleId = useId('joinDialog__title');
  const themeContextValue = useThemeContext();

  return (
    <ThemeContext.Provider value={{ ...themeContextValue, tx: osTx }}>
      <AlertDialog.Root defaultOpen>
        <AlertDialog.Portal>
          <AlertDialog.Overlay>
            <AlertDialog.Content>
              <JoinPanel
                {...{
                  ...joinPanelProps,
                  titleId,
                  exitActionParent: <AlertDialog.Cancel asChild />,
                  doneActionParent: <AlertDialog.Action asChild />,
                }}
              />
            </AlertDialog.Content>
          </AlertDialog.Overlay>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ThemeContext.Provider>
  );
};
