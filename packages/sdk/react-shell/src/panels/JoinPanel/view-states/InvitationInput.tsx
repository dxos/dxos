//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { ComponentPropsWithoutRef, useEffect, useState } from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { log } from '@dxos/log';
import { Input } from '@dxos/react-appkit';

import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface InvitationInputProps extends ViewStateProps {
  Kind: 'Space' | 'Halo';
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

export const InvitationInput = ({ Kind, ...viewStateProps }: InvitationInputProps) => {
  const disabled = !viewStateProps.active;
  const { joinSend, joinState } = viewStateProps;
  const { t } = useTranslation('os');

  const contextUnredeemedCode = joinState?.context[Kind.toLowerCase() as 'space' | 'halo'].unredeemedCode;

  const [inputValue, setInputValue] = useState(contextUnredeemedCode ?? '');

  useEffect(() => {
    contextUnredeemedCode && setInputValue(contextUnredeemedCode ?? '');
  }, [contextUnredeemedCode]);

  const handleNext = () =>
    joinSend({
      type: `set${Kind}InvitationCode`,
      code: invitationCodeFromUrl(inputValue),
    });

  return (
    <ViewState {...viewStateProps}>
      <Input
        disabled={disabled}
        label={<ViewStateHeading>{t('invitation input label')}</ViewStateHeading>}
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
      />
      <div role='none' className='grow' />
      <div className='flex gap-2'>
        <Button
          disabled={disabled}
          classNames='grow flex items-center gap-2 pli-2 order-2'
          onClick={handleNext}
          data-testid={`${Kind.toLowerCase()}-invitation-input-continue`}
        >
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('continue label')}</span>
          <CaretRight weight='bold' className={getSize(4)} />
        </Button>
        <Button
          disabled={disabled || Kind === 'Space'}
          onClick={() => joinSend({ type: 'deselectAuthMethod' })}
          classNames='flex items-center gap-2 pis-2 pie-4'
          data-testid={`${Kind.toLowerCase()}-invitation-input-back`}
        >
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('back label')}</span>
        </Button>
      </div>
    </ViewState>
  );
};
