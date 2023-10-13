//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AlertDialog, type AlertDialogContentProps, useId, useVisualViewport } from '@dxos/aurora';

import { JoinPanel, type JoinPanelProps } from '../../panels';

export interface JoinDialogProps
  extends Omit<AlertDialogContentProps, 'children'>,
    Omit<JoinPanelProps, 'exitActionParent' | 'doneActionParent'> {}

export const JoinDialog = (joinPanelProps: JoinDialogProps) => {
  const titleId = useId('joinDialog__title');
  // todo(thure): This doesn’t work within an iframe on iOS Safari.
  const { height } = useVisualViewport();
  return (
    <AlertDialog.Root
      defaultOpen
      onOpenChange={(open) => open || (joinPanelProps.onExit ? joinPanelProps.onExit() : joinPanelProps.onDone?.(null))}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay classNames='backdrop-blur' {...(height && { style: { blockSize: `${height}px` } })}>
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
