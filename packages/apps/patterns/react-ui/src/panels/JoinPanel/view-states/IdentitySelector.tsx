//
// Copyright 2023 DXOS.org
//

import * as RadioGroup from '@radix-ui/react-radio-group';
import { CaretLeft, CaretRight, UserPlus } from 'phosphor-react';
import React, { useCallback, useState } from 'react';

import type { Profile } from '@dxos/client';
import { Avatar, Button, themeVariantFocus, getSize, mx, useTranslation } from '@dxos/react-components';

import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface IdentitySelectorProps extends ViewStateProps {
  availableIdentities: Profile[];
}

export const IdentitySelector = ({ availableIdentities, ...viewStateProps }: IdentitySelectorProps) => {
  const { dispatch } = viewStateProps;
  const disabled = !viewStateProps.active;

  const { t } = useTranslation('os');
  const [activeIdentity, setActiveIdentity] = useState(availableIdentities[0]);
  const onValueChange = useCallback(
    (nextHex: string) =>
      setActiveIdentity(
        availableIdentities.find((identity) => identity.identityKey.toHex() === nextHex) || activeIdentity
      ),
    [availableIdentities]
  );

  return (
    <ViewState {...viewStateProps}>
      <ViewStateHeading>{t('identity selector title')}</ViewStateHeading>
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
            <label htmlFor={inputId} key={hex} className='flex items-center mbe-2 gap-2 cursor-pointer'>
              <RadioGroup.Item
                id={inputId}
                aria-labelledby={labelId}
                value={hex}
                className={mx(
                  'peer relative w-4 h-4 rounded-full',
                  'border border-transparent text-white',
                  'radix-state-checked:bg-primary-600',
                  'radix-state-unchecked:bg-neutral-100 dark:radix-state-unchecked:bg-neutral-900',
                  themeVariantFocus('os')
                )}
                data-testid='identity-selector-item'
              >
                <RadioGroup.Indicator className='absolute inset-0 flex items-center justify-center leading-0'>
                  <div className='w-1.5 h-1.5 rounded-full bg-white' />
                </RadioGroup.Indicator>
              </RadioGroup.Item>
              <Avatar fallbackValue={hex} labelId={labelId} variant='circle' />
              <span id={labelId} className={mx(!displayName && 'font-mono')}>
                {displayName ?? identityKey.truncate() ?? ''}
              </span>
            </label>
          );
        })}
      </RadioGroup.Root>
      <Button
        disabled={disabled}
        compact
        onClick={() => dispatch({ type: 'add identity' })}
        className='flex items-center gap-2 pli-2'
        data-testid='add-identity'
      >
        <span>{t('add identity label')}</span>
        <UserPlus weight='bold' className={getSize(3.5)} />
      </Button>
      <Button
        disabled={disabled || !activeIdentity}
        className='flex items-center gap-2 pli-2'
        onClick={() =>
          dispatch({
            type: 'select identity',
            identity: activeIdentity
          })
        }
        data-testid='select-identity'
      >
        <CaretLeft weight='bold' className={mx(getSize(4), 'invisible')} />
        <span className='grow'>{t('continue label')}</span>
        <CaretRight weight='bold' className={getSize(4)} />
      </Button>
    </ViewState>
  );
};
