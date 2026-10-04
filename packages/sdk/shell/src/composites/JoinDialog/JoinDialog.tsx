//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AlertDialog, Dialog, useId, useTranslation, useVisualViewport } from '@dxos/react-ui';

import { JoinPanel, type JoinPanelProps } from '../../panels/index.ts';
import { translationKey } from '../../translations.ts';

type AlertDialogContentProps = React.ComponentProps<typeof AlertDialog.Content>;

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
      onOpenChange={({ open }) =>
        open || (joinPanelProps.onExit ? joinPanelProps.onExit() : joinPanelProps.onDone?.(null))
      }
    >
      <AlertDialog.Content aria-labelledby={titleId}>
        <AlertDialog.Body>
          <AlertDialog.Description srOnly>
            {t(joinPanelProps.mode === 'halo-only' ? 'selecting-identity.heading' : 'joining-space.heading')}
          </AlertDialog.Description>
          <JoinPanel
            {...{
              ...joinPanelProps,
              titleId,
              exitActionParent: <Dialog.CloseTrigger asChild />,
              doneActionParent: <Dialog.CloseTrigger asChild />,
            }}
          />
        </AlertDialog.Body>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};
