//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  ThemeContext,
  AlertDialogContentProps,
  useId,
  useThemeContext,
  AlertDialogCancel,
  AlertDialogAction,
} from '@dxos/aurora';
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
      <AlertDialogRoot defaultOpen>
        <AlertDialogPortal>
          <AlertDialogOverlay>
            <AlertDialogContent>
              <JoinPanel
                {...{
                  ...joinPanelProps,
                  titleId,
                  exitActionParent: <AlertDialogCancel asChild />,
                  doneActionParent: <AlertDialogAction asChild />,
                }}
              />
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialogPortal>
      </AlertDialogRoot>
    </ThemeContext.Provider>
  );
};
