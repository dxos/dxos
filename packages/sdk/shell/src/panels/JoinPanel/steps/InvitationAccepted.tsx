//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';

import { translationKey } from '../../../translations.ts';
import { type JoinStepProps } from '../JoinPanelProps.ts';

export interface InvitationAcceptedProps extends JoinStepProps {
  Kind: 'Space' | 'Halo';
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
}

export const InvitationAccepted = (props: InvitationAcceptedProps) => {
  const { active, Kind, doneActionParent, onDone } = props;
  const disabled = !active;
  const { t } = Hooks.useTranslation(translationKey);

  const doneAction = (
    <Button.Root
      variant='primary'
      onClick={onDone}
      disabled={disabled}
      data-autofocus={`success${Kind}Invitation finishingJoining${Kind}`}
      data-testid={`${Kind.toLowerCase()}-invitation-accepted-done`}
    >
      {t('done.label')}
    </Button.Root>
  );

  return (
    <>
      <div className='grow flex flex-col justify-center'>
        <p className='text-center text-sm font-normal'>{t('welcome.message')}</p>
      </div>
      <Dialog.Footer>{doneActionParent ? cloneElement(doneActionParent, {}, doneAction) : doneAction}</Dialog.Footer>
    </>
  );
};
