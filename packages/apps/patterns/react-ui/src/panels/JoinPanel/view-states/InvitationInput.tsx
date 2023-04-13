//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { ComponentPropsWithoutRef, useEffect, useState } from 'react';

import { useTranslation } from '@dxos/react-components';

import { Button, Content, Heading, Input } from '../../Panel';
import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface InvitationInputProps extends ViewStateProps {
  Kind: 'Space' | 'Halo';
}

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
      code: inputValue
    });

  return (
    <ViewState {...viewStateProps}>
      <Content className='mbs-0'>
        <Input
          disabled={disabled}
          label={<Heading className='mbs-0'>{t('invitation input label')}</Heading>}
          value={inputValue}
          onChange={({ target: { value } }) => setInputValue(value)}
          slots={{
            input: {
              className: 'text-center',
              autoFocus: true,
              'data-autofocus': `inputting${Kind}InvitationCode`,
              'data-testid': `${Kind.toLowerCase()}-invitation-input`,
              onKeyUp: ({ key }) => key === 'Enter' && handleNext()
            } as ComponentPropsWithoutRef<'input'>
          }}
        />

        <Button
          disabled={disabled}
          onClick={handleNext}
          data-testid={`${Kind.toLowerCase()}-invitation-input-continue`}
        >
          <span className='grow'>{t('continue label')}</span>
        </Button>
        {Kind !== 'Space' && (
          <Button
            variant='ghost'
            onClick={() => joinSend({ type: 'deselectAuthMethod' })}
            data-testid={`${Kind.toLowerCase()}-invitation-input-back`}
          >
            <span>{t('back label')}</span>
          </Button>
        )}
      </Content>
    </ViewState>
  );
};
