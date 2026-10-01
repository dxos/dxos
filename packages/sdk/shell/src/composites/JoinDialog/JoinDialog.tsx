//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useId, useTranslation, useVisualViewport } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { JoinPanel, type JoinPanelProps } from '../../panels/index.ts';
import { translationKey } from '../../translations.ts';

type AlertDialogContentProps = React.ComponentProps<typeof Next.AlertDialog.Content>;

export interface JoinDialogProps
  extends Omit<AlertDialogContentProps, 'children'>, Omit<JoinPanelProps, 'exitActionParent' | 'doneActionParent'> {}

export const JoinDialog = (joinPanelProps: JoinDialogProps) => {
  const { t } = useTranslation(translationKey);
  const titleId = useId('joinDialog__title');
  // todo(thure): This doesn’t work within an iframe on iOS Safari.
  const { height } = useVisualViewport();
  return (
    <Next.AlertDialog.Root
      defaultOpen
      onOpenChange={({ open }) =>
        open || (joinPanelProps.onExit ? joinPanelProps.onExit() : joinPanelProps.onDone?.(null))
      }
    >
      <Next.AlertDialog.Content aria-labelledby={titleId}>
        <Next.AlertDialog.Body>
          <Next.AlertDialog.Description srOnly>
            {t(joinPanelProps.mode === 'halo-only' ? 'selecting-identity.heading' : 'joining-space.heading')}
          </Next.AlertDialog.Description>
          <JoinPanel
            {...{
              ...joinPanelProps,
              titleId,
              exitActionParent: <Next.Dialog.CloseTrigger asChild />,
              doneActionParent: <Next.Dialog.CloseTrigger asChild />,
            }}
          />
        </Next.AlertDialog.Body>
      </Next.AlertDialog.Content>
    </Next.AlertDialog.Root>
  );
};
