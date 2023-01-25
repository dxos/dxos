//
// Copyright 2023 DXOS.org
//

import * as RadioGroup from '@radix-ui/react-radio-group';
import { CaretLeft, CaretRight, UserPlus } from 'phosphor-react';
import React, { useCallback, useState } from 'react';

import { Avatar, Button, defaultFocus, getSize, mx, useTranslation } from '@dxos/react-components';

import { JoinDispatch, Profile } from '../JoinPanelProps';
import { ViewState, ViewStateProps } from './ViewState';

export interface IdentitySelectorProps extends ViewStateProps {
  dispatch: JoinDispatch;
  availableIdentities: Profile[];
}

export const IdentitySelector = ({ dispatch, availableIdentities, ...viewStateProps }: IdentitySelectorProps) => {
  const { t } = useTranslation('os');
  const [activeIdentity, setActiveIdentity] = useState(availableIdentities[0]);
  const onValueChange = useCallback(
    (nextHex: string) =>
      setActiveIdentity(
        availableIdentities.find((identity) => identity.identityKey.toHex() === nextHex) || activeIdentity
      ),
    [availableIdentities]
  );
  const disabled = !viewStateProps.active;
  return (
    <ViewState {...viewStateProps}>
      <h2 className='font-system-medium text-sm'>{t('identity selector title')}</h2>
      <RadioGroup.Root
        disabled={disabled}
        value={activeIdentity?.identityKey.toHex()}
        onValueChange={onValueChange}
        className='overflow-y-auto grow shrink min-bs-10 pli-1 -mli-1'
        aria-label={t('identity radio group title')}
        data-autofocus='identity selector'
      >
        {availableIdentities.map(({ displayName, identityKey }) => {
          const hex = identityKey.toHex();
          const inputId = `identitySelector__item--${hex}`;
          const labelId = `identitySelector__itemLabel--${hex}`;
          return (
            <div key={hex} className='flex items-center mbe-2'>
              <RadioGroup.Item
                id={inputId}
                aria-labelledby={labelId}
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
              <div className='pis-1 block text-base grow cursor-pointer flex items-center gap-1'>
                <Avatar fallbackValue={hex} labelId={labelId} variant='circle' />
                <span id={labelId}>{displayName}</span>
              </div>
            </div>
          );
        })}
      </RadioGroup.Root>
      <Button
        disabled={disabled}
        compact
        onClick={() => dispatch({ type: 'add identity' })}
        className='flex items-center gap-2 pli-2'
      >
        <span>{t('add identity label')}</span>
        <UserPlus weight='bold' className={getSize(3.5)} />
      </Button>
      <Button
        disabled={disabled}
        className='flex items-center gap-2 pli-2'
        onClick={() =>
          dispatch({
            type: 'select identity',
            identity: activeIdentity
          })
        }
      >
        <CaretLeft weight='bold' className={mx(getSize(4), 'invisible')} />
        <span className='grow'>{t('continue label')}</span>
        <CaretRight weight='bold' className={getSize(4)} />
      </Button>
    </ViewState>
  );
};
