//
// Copyright 2022 DXOS.org
//

import React, { useCallback, KeyboardEvent, useMemo, ChangeEvent } from 'react';

import { Button, mx, useTranslation } from '@dxos/aurora';

import { GroupProps } from '../Group';
import { Input, InputProps } from '../Input';
import { Loading } from '../Loading';

export interface SingleInputStepProps extends Omit<GroupProps, 'label' | 'onChange'> {
  inputLabel: string;
  onChange: (value: ChangeEvent<HTMLInputElement>) => void;
  pending?: boolean;
  onBack?: () => void;
  backLabel?: string;
  onNext: () => void;
  nextLabel?: string;
  onCancelPending?: () => void;
  cancelPendingLabel?: string;
  loadingLabel?: string;
  inputPlaceholder?: string;
  inputProps?: Omit<InputProps, 'label' | 'placeholder'>;
}

export const SingleInputStep = ({
  inputLabel,
  onChange,
  pending,
  onBack,
  backLabel,
  onNext,
  nextLabel,
  onCancelPending,
  cancelPendingLabel,
  loadingLabel,
  inputPlaceholder,
  inputProps
}: SingleInputStepProps) => {
  const { t } = useTranslation('appkit');
  const onKeyUp = useCallback((e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && onNext(), [onNext]);
  const inputSlots = useMemo(
    () => ({ ...inputProps?.slots, input: { onKeyUp, autoFocus: true, ...inputProps?.slots?.input } }),
    [onKeyUp, inputProps?.slots]
  );
  return (
    <>
      <Input
        size='lg'
        label={t(inputLabel)}
        {...inputProps}
        {...(inputPlaceholder && { placeholder: t(inputPlaceholder) })}
        {...(pending && { disabled: true })}
        onChange={onChange}
        slots={inputSlots}
      />
      <div role='none' aria-live='polite' className='flex gap-4 justify-end items-center'>
        <Button variant='primary' onClick={onNext} {...(pending && { disabled: true })} className='order-last'>
          {nextLabel ?? t('next label')}
        </Button>
        {onBack && (
          <Button onClick={onBack} {...(pending && { disabled: true })}>
            {backLabel ?? t('back label')}
          </Button>
        )}
        <div role='none' className='grow' />
        <div role='none' className={mx(!pending && 'hidden')}>
          <Loading label={loadingLabel || t('generic loading label')} slots={{ root: { className: 'p-0 mis-0' } }} />
        </div>
        {onCancelPending && (
          <Button onClick={onCancelPending} {...(!pending && { disabled: true })}>
            {cancelPendingLabel ?? t('cancel label')}
          </Button>
        )}
      </div>
    </>
  );
};
