//
// Copyright 2023 DXOS.org
//

import React, { cloneElement, useEffect, useState } from 'react';

import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { translationKey } from '../../../translations.ts';
import { type JoinPanelProps, type JoinStepProps } from '../JoinPanelProps.ts';

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
  const { t } = Hooks.useTranslation(translationKey);

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
    <Button.Root
      variant='ghost'
      disabled={disabled}
      {...(onExit ? { onClick: () => onExit() } : { onClick: () => onDone?.(null) })}
      data-testid='join-exit'
    >
      {t('cancel.label')}
    </Button.Root>
  );

  return (
    <>
      <Dialog.Body>
        <Field.Root>
          <Field.Label>{t('invitation-input.label')}</Field.Label>
          <Input.Root
            placeholder={t('invitation-input.placeholder')}
            disabled={disabled}
            value={inputValue}
            onChange={({ target: { value } }) => setInputValue(value)}
            data-autofocus={`inputting${Kind}InvitationCode`}
            data-testid={`${Kind.toLowerCase()}-invitation-input`}
            onKeyUp={({ key }) => key === 'Enter' && handleNext()}
          />
        </Field.Root>
      </Dialog.Body>
      <Dialog.Footer>
        {/* TODO(wittjosiah): This disables returning to deprecated identity creation flow. */}
        {Kind === 'Halo'
          ? null
          : exitActionParent
            ? cloneElement(exitActionParent, {}, exitAction)
            : doneActionParent
              ? cloneElement(doneActionParent, {}, exitAction)
              : exitAction}
        <Button.Root
          variant='primary'
          disabled={disabled || inputValue.trim().length === 0}
          onClick={handleNext}
          data-testid={`${Kind.toLowerCase()}-invitation-input-continue`}
        >
          {t('continue.label')}
        </Button.Root>
      </Dialog.Footer>
    </>
  );
};
