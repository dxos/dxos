//
// Copyright 2023 DXOS.org
//

import * as RadioGroup from '@radix-ui/react-radio-group';
import { CaretLeft, CaretRight, UserPlus } from 'phosphor-react';
import React from 'react';

import { Avatar, Button, defaultFocus, getSize, mx, useTranslation } from '@dxos/react-components';

import { JoinDispatch, Profile } from '../JoinPanelProps';
import { ViewState } from './ViewState';

export interface IdentitySelectorProps {
  dispatch: JoinDispatch;
  availableIdentities: Profile[];
}

export const IdentitySelector = ({ dispatch, availableIdentities }: IdentitySelectorProps) => {
  const { t } = useTranslation('os');
  return (
    <ViewState>
      <h2 className='font-system-medium text-sm'>{t('identity selector title')}</h2>
      <RadioGroup.Root
        className='overflow-y-auto grow shrink min-bs-10 pli-1 -mli-1'
        aria-label={t('identity radio group title')}
      >
        {availableIdentities.map(({ displayName, identityKey }) => {
          const hex = identityKey.toHex();
          const inputId = `identitySelector__item--${hex}`;
          return (
            <div key={hex} className='flex items-center'>
              <RadioGroup.Item
                id={inputId}
                value={hex}
                className={mx(
                  'peer relative w-4 h-4 rounded-full',
                  'border border-transparent text-white',
                  'radix-state-checked:bg-primary-600',
                  'radix-state-unchecked:bg-neutral-100 dark:radix-state-unchecked:bg-neutral-900',
                  defaultFocus
                )}
              >
                <RadioGroup.Indicator className='absolute inset-0 flex items-center justify-center leading-0'>
                  <div className='w-1.5 h-1.5 rounded-full bg-white' />
                </RadioGroup.Indicator>
              </RadioGroup.Item>
              <label htmlFor={inputId} className='pis-1 block text-base grow cursor-pointer flex items-center gap-1'>
                <Avatar fallbackValue={hex} label={<span>{displayName}</span>} variant='circle' />
              </label>
            </div>
          );
        })}
      </RadioGroup.Root>
      <Button compact onClick={() => dispatch({ type: 'add identity' })} className='flex items-center gap-2 pli-2'>
        <span>{t('add identity label')}</span>
        <UserPlus className={getSize(4)} />
      </Button>
      <Button
        className='flex items-center gap-2 pli-2'
        onClick={() =>
          dispatch({
            type: 'select identity',
            identity: availableIdentities[0]
          })
        }
      >
        <CaretLeft className={mx(getSize(5), 'invisible')} />
        <span className='grow'>{t('continue label')}</span>
        <CaretRight className={getSize(5)} />
      </Button>
    </ViewState>
  );
};
