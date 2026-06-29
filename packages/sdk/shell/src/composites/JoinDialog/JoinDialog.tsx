//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AlertDialogContentProps, AlertDialog, useId, useTranslation, useVisualViewport } from '@dxos/react-ui';

import { type JoinPanelProps, JoinPanel } from '../../panels';
import { translationKey } from '../../translations';

export interface JoinDialogProps
  extends Omit<AlertDialogContentProps, 'children'>, Omit<JoinPanelProps, 'exitActionParent' | 'doneActionParent'> {}

export const JoinDialog = (joinPanelProps: JoinDialogProps) => {
  const { t } = useTranslation(translationKey);
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
            <AlertDialog.Body>
              <AlertDialog.Description srOnly>
                {t(joinPanelProps.mode === 'halo-only' ? 'selecting-identity.heading' : 'joining-space.heading')}
              </AlertDialog.Description>
              <JoinPanel
                {...{
                  ...joinPanelProps,
                  titleId,
                  exitActionParent: <AlertDialog.Cancel asChild />,
                  doneActionParent: <AlertDialog.Action asChild />,
                }}
              />
            </AlertDialog.Body>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
