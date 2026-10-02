//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as Hooks from '@dxos/react-ui/Hooks';

import { JoinPanel, type JoinPanelProps } from '../../panels/index.ts';
import { translationKey } from '../../translations.ts';

export interface JoinDialogProps
  extends Omit<AlertDialog.ContentProps, 'children'>, Omit<JoinPanelProps, 'exitActionParent' | 'doneActionParent'> {}

export const JoinDialog = (joinPanelProps: JoinDialogProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const titleId = Hooks.useId('joinDialog__title');
  // todo(thure): This doesn’t work within an iframe on iOS Safari.
  const { height } = Hooks.useVisualViewport();
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
