//
// Copyright 2023 DXOS.org
//

import { SignOut } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { log } from '@dxos/log';

import { PanelAction, PanelActions, PanelStepHeading } from '../../../components';
import { LargeButton } from '../../../components/Panel/LargeButton';
import { LargeInput } from '../../../components/Panel/LargeInput';
import { JoinPanelProps, JoinStepProps } from '../JoinPanelProps';

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

export const InvitationInput = ({
  Kind,
  active,
  send,
  unredeemedCode,
  onExit,
  exitActionParent,
  onDone,
  doneActionParent,
}: InvitationInputProps) => {
  const disabled = !active;
  const { t } = useTranslation('os');

  const [inputValue, setInputValue] = useState(unredeemedCode ?? '');

  useEffect(() => {
    unredeemedCode && setInputValue(unredeemedCode ?? '');
  }, [unredeemedCode]);

  // const handleNext = () =>
  //   send({
  //     type: `set${Kind}InvitationCode`,
  //     code: invitationCodeFromUrl(inputValue),
  //   });

  // const exitAction = (
  //   <PanelAction
  //     aria-label={t('cancel label')}
  //     disabled={disabled}
  //     {...(onExit ? { onClick: () => onExit() } : { onClick: () => onDone?.(null) })}
  //     data-testid='join-exit'
  //   >
  //     <SignOut mirrored weight='light' className={getSize(6)} />
  //   </PanelAction>
  // );

  return (
    <>
      {/* <Input
        disabled={disabled}
        label={<PanelStepHeading>{t('invitation input label')}</PanelStepHeading>}
        value={inputValue}
        onChange={({ target: { value } }) => setInputValue(value)}
        slots={{
          root: { className: 'm-0' },
          input: {
            'data-autofocus': `inputting${Kind}InvitationCode`,
            'data-testid': `${Kind.toLowerCase()}-invitation-input`,
            onKeyUp: ({ key }) => key === 'Enter' && handleNext(),
          } as ComponentPropsWithoutRef<'input'>,
        }}
      /> */}

      <div role='none' className='grow flex flex-col justify-center'>
        <LargeInput
          label={<PanelStepHeading>{t('invitation input label')}</PanelStepHeading>}
          placeholder='Type an invitation code'
        />
      </div>
      <PanelActions classNames='flex flex-col'>
        <LargeButton variant='ghost'>Back</LargeButton>
        <LargeButton variant='primary'>Continue</LargeButton>
        {/* <PanelAction
          aria-label={t('continue label')}
          disabled={disabled}
          classNames='order-2'
          onClick={handleNext}
          data-testid={`${Kind.toLowerCase()}-invitation-input-continue`}
        >
          <CaretRight weight='light' className={getSize(6)} />
        </PanelAction>
        {Kind === 'Halo' ? (
          <PanelAction
            aria-label={t('back label')}
            disabled={disabled}
            onClick={() => send({ type: 'deselectAuthMethod' })}
            data-testid={`${Kind.toLowerCase()}-invitation-input-back`}
          >
            <CaretLeft weight='light' className={getSize(6)} />
          </PanelAction>
        ) : exitActionParent ? (
          cloneElement(exitActionParent, {}, exitAction)
        ) : doneActionParent ? (
          cloneElement(doneActionParent, {}, exitAction)
        ) : (
          exitAction
        )} */}
      </PanelActions>
    </>
  );
};
