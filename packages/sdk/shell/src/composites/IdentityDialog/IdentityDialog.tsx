//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type DialogContentProps, Dialog, useId, Status, useTranslation } from '@dxos/react-ui';

import { ClipboardProvider } from '../../components';
import { IdentityPanel, type IdentityPanelProps } from '../../panels';

export interface IdentityDialogProps
  extends Omit<DialogContentProps, 'children'>,
    Omit<IdentityPanelProps, 'doneActionParent'> {
  onDone: () => void;
}

export const IdentityDialog = (props: IdentityDialogProps) => {
  const titleId = useId('spaceDialog__title');
  const [pending, setPending] = useState(false);
  const { t } = useTranslation('os');
  const onJoinNewIdentity = async () => {
    setPending(true);
    await props.onJoinNewIdentity?.();
    setPending(false);
  };
  const onResetStorage = async () => {
    setPending(true);
    await props.onResetStorage?.();
    setPending(false);
  };
  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => open || props.onDone?.()}>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content aria-labelledby={titleId} onOpenAutoFocus={(e) => e.preventDefault()}>
            <ClipboardProvider>
              {!pending ? (
                <IdentityPanel
                  {...{
                    ...props,
                    titleId,
                    doneActionParent: <Dialog.Close asChild />,
                    onJoinNewIdentity,
                    onResetStorage,
                  }}
                />
              ) : (
                <div className='grid place-items-center p-2 gap-2'>
                  <p className='font-medium text-center'>{t('resetting message')}</p>
                  <Status indeterminate>{t('resetting message')}</Status>
                </div>
              )}
            </ClipboardProvider>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
