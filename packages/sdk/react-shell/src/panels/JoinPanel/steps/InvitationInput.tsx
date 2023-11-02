//
// Copyright 2023 DXOS.org
//

import React, { useState, useEffect, cloneElement } from 'react';

import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';

import { Actions, StepHeading } from '../../../components';
import { Action } from '../../../components/Panel/Action';
import { Input } from '../../../components/Panel/Input';
import { type JoinPanelProps, type JoinStepProps } from '../JoinPanelProps';

export interface InvitationInputProps extends JoinStepProps, Pick<JoinPanelProps, 'onExit' | 'exitActionParent'> {
  Kind: 'Space' | 'Halo';
  unredeemedCode?: string;
}

const invitationCodeFromUrl = (text: string) => {
  try {
    const searchParams = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    const invitation = searchParams.get('spaceInvitationCode') ?? searchParams.get('deviceInvitationCode');
    return invitation ?? text;
  } catch (err) {
    log.catch(err);
    return text;
  }
};

export const InvitationInput = (props: InvitationInputProps) => {
  const { Kind, active, send, unredeemedCode, onExit, exitActionParent, onDone, doneActionParent } = props;
  const disabled = !active;
  const { t } = useTranslation('os');

  const [inputValue, setInputValue] = useState(unredeemedCode ?? '');

  useEffect(() => {
    unredeemedCode && setInputValue(unredeemedCode ?? '');
  }, [unredeemedCode]);

  const handleNext = () =>
    send({
      type: `set${Kind}InvitationCode`,
      code: invitationCodeFromUrl(inputValue),
    });

  const exitAction = (
    <Action
      variant='ghost'
      disabled={disabled}
      {...(onExit ? { onClick: () => onExit() } : { onClick: () => onDone?.(null) })}
      data-testid='join-exit'
    >
      {t('cancel label')}
    </Action>
  );

  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <Input
          label={<StepHeading>{t('invitation input label')}</StepHeading>}
          placeholder='Type an invitation code'
          disabled={disabled}
          value={inputValue}
          onChange={({ target: { value } }) => setInputValue(value)}
          data-autofocus={`inputting${Kind}InvitationCode`}
          data-testid={`${Kind.toLowerCase()}-invitation-input`}
          onKeyUp={({ key }) => key === 'Enter' && handleNext()}
        />
      </div>
      <Actions>
        {Kind === 'Halo' ? (
          <Action
            variant='ghost'
            disabled={disabled}
            onClick={() => send({ type: 'deselectAuthMethod' })}
            data-testid={`${Kind.toLowerCase()}-invitation-input-back`}
          >
            {t('back label')}
          </Action>
        ) : exitActionParent ? (
          cloneElement(exitActionParent, {}, exitAction)
        ) : doneActionParent ? (
          cloneElement(doneActionParent, {}, exitAction)
        ) : (
          exitAction
        )}
        <Action
          variant='primary'
          disabled={disabled}
          onClick={handleNext}
          data-testid={`${Kind.toLowerCase()}-invitation-input-continue`}
        >
          {t('continue label')}
        </Action>
      </Actions>
    </>
  );
};
