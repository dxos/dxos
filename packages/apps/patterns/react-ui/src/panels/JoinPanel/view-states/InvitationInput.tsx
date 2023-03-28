//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { ComponentPropsWithoutRef, useEffect, useState } from 'react';

import { Button, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface InvitationInputProps extends ViewStateProps {
  Domain: 'Space' | 'Halo';
}

export const InvitationInput = ({ Domain, ...viewStateProps }: InvitationInputProps) => {
  const disabled = !viewStateProps.active;
  const { joinSend, joinState } = viewStateProps;
  const { t } = useTranslation('os');

  const contextUnredeemedCode = joinState?.context[Domain.toLowerCase() as 'space' | 'halo'].unredeemedCode;

  const [inputValue, setInputValue] = useState(contextUnredeemedCode ?? '');

  useEffect(() => {
    contextUnredeemedCode && setInputValue(contextUnredeemedCode ?? '');
  }, [contextUnredeemedCode]);

  const handleNext = () =>
    joinSend({
      type: `set${Domain}InvitationCode`,
      code: inputValue
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
            'data-autofocus': `inputting${Domain}InvitationCode`,
            'data-testid': `${Domain.toLowerCase()}-invitation-input`,
            onKeyUp: ({ key }) => key === 'Enter' && handleNext()
          } as ComponentPropsWithoutRef<'input'>
        }}
      />
      <div role='none' className='grow' />
      <div className='flex gap-2'>
        <Button
          disabled={disabled}
          className='grow flex items-center gap-2 pli-2 order-2'
          onClick={handleNext}
          data-testid={`${Domain.toLowerCase()}-invitation-input-continue`}
        >
          <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
          <span className='grow'>{t('continue label')}</span>
          <CaretRight weight='bold' className={getSize(4)} />
        </Button>
        <Button
          disabled={Domain === 'Space'}
          onClick={() => joinSend({ type: 'deselectAuthMethod' })}
          className='flex items-center gap-2 pis-2 pie-4'
          data-testid={`${Domain.toLowerCase()}-invitation-input-back`}
        >
          <CaretLeft weight='bold' className={getSize(4)} />
          <span>{t('back label')}</span>
        </Button>
      </div>
    </ViewState>
  );
};
