//
// Copyright 2023 DXOS.org
//

import React, { cloneElement, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { useTranslation } from '@dxos/react-ui';

import { Action, Actions, Input, StepHeading } from '../../../components';
import { type JoinPanelProps, type JoinStepProps } from '../JoinPanelProps';

export interface InvitationInputProps extends JoinStepProps, Pick<JoinPanelProps, 'onExit' | 'exitActionParent'> {
  Kind: 'Space' | 'Halo';
  unredeemedCode?: string;
  succeededKeys?: Set<string>;
}

const invitationCodeFromUrl = (text: string) => {
  try {
    const searchProps = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    const invitation = searchProps.get('spaceInvitationCode') ?? searchProps.get('deviceInvitationCode');
    return invitation ?? text;
  } catch (err) {
    log.catch(err);
    return text;
  }
};

export const InvitationInput = (props: InvitationInputProps) => {
  const { Kind, active, send, unredeemedCode, onExit, exitActionParent, onDone, doneActionParent, succeededKeys } =
    props;
  const disabled = !active;
  const { t } = useTranslation('os');

  const [inputValue, setInputValue] = useState(unredeemedCode ?? '');

  useEffect(() => {
    unredeemedCode && setInputValue(unredeemedCode ?? '');
  }, [unredeemedCode]);

  const handleNext = () => {
    if (inputValue.trim().length === 0) {
      return;
    }

    send({
      type: `set${Kind}InvitationCode`,
      code: invitationCodeFromUrl(inputValue),
      ...(Kind === 'Space' && { succeededKeys }),
    });
  };

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
          placeholder={t('invitation input placeholder')}
          disabled={disabled}
          value={inputValue}
          onChange={({ target: { value } }) => setInputValue(value)}
          data-autofocus={`inputting${Kind}InvitationCode`}
          data-testid={`${Kind.toLowerCase()}-invitation-input`}
          onKeyUp={({ key }) => key === 'Enter' && handleNext()}
        />
      </div>
      <Actions>
        {/* TODO(wittjosiah): This disables returning to deprecated identity creation flow. */}
        {Kind === 'Halo'
          ? null
          : exitActionParent
            ? cloneElement(exitActionParent, {}, exitAction)
            : doneActionParent
              ? cloneElement(doneActionParent, {}, exitAction)
              : exitAction}
        <Action
          variant='primary'
          disabled={disabled || inputValue.trim().length === 0}
          onClick={handleNext}
          data-testid={`${Kind.toLowerCase()}-invitation-input-continue`}
        >
          {t('continue label')}
        </Action>
      </Actions>
    </>
  );
};
