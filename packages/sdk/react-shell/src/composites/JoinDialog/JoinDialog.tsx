//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AlertDialog, AlertDialogContentProps, useId } from '@dxos/aurora';

import { JoinPanel, JoinPanelProps } from '../../panels';

export interface JoinDialogProps
  extends Omit<AlertDialogContentProps, 'children'>,
    Omit<JoinPanelProps, 'exitActionParent' | 'doneActionParent'> {}

export const JoinDialog = (joinPanelProps: JoinDialogProps) => {
  const titleId = useId('joinDialog__title');

  return (
    <AlertDialog.Root
      defaultOpen
      onOpenChange={(open) => open || (joinPanelProps.onExit ? joinPanelProps.onExit() : joinPanelProps.onDone?.(null))}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay>
          <AlertDialog.Content aria-labelledby={titleId}>
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
  );
};
