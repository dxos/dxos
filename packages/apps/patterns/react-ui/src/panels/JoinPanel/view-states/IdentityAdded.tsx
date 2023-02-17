//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight, Check } from 'phosphor-react';
import React, { cloneElement } from 'react';

import type { Profile } from '@dxos/client';
import { InvitationResult } from '@dxos/react-client';
import { Avatar, Button, getSize, mx, useTranslation } from '@dxos/react-components';

import { JoinPanelMode } from '../JoinPanelProps';
import { ViewState, ViewStateHeading, ViewStateProps } from './ViewState';

export interface IdentityAddedProps extends ViewStateProps, DoneProps {
  mode?: JoinPanelMode;
  addedIdentity?: Profile;
}

export interface DoneProps extends ViewStateProps {
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: (result: InvitationResult | null) => void;
}

const Done = ({ onDone, doneActionParent, active }: DoneProps) => {
  const disabled = !active;
  const { t } = useTranslation('os');

  const doneButton = (
    <Button
      {...(onDone && { onClick: () => onDone(null) })}
      disabled={disabled}
      className='grow flex items-center gap-2 pli-2'
      data-autofocus='identity added'
      data-testid='identity-added-done'
    >
      <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check weight='bold' className={getSize(4)} />
    </Button>
  );

  return doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton;
};

export const IdentityAdded = ({
  mode,
  addedIdentity,
  onDone,
  doneActionParent,
  ...viewStateProps
}: IdentityAddedProps) => {
  const disabled = !viewStateProps.active;
  const { dispatch } = viewStateProps;
  const { t } = useTranslation('os');

  return (
    <ViewState {...viewStateProps}>
      <ViewStateHeading>{t('identity added label')}</ViewStateHeading>
      <div role='none' className='grow flex flex-col items-center justify-center text-center gap-2'>
        <Avatar
          size={20}
          fallbackValue={addedIdentity?.identityKey.toHex() ?? ''}
          label={
            <p className={mx('text-lg', !addedIdentity?.displayName && 'font-mono')}>
              {addedIdentity?.displayName ?? addedIdentity?.identityKey.truncate() ?? ' '}
            </p>
          }
          variant='circle'
          status='active'
        />
      </div>
      {mode === 'halo-only' ? (
        <Done onDone={onDone} doneActionParent={doneActionParent} {...viewStateProps} />
      ) : (
        <div className='flex gap-2'>
          <Button
            disabled={disabled || !addedIdentity}
            className='grow flex items-center gap-2 pli-2 order-2'
            onClick={() => addedIdentity && dispatch({ type: 'select identity', identity: addedIdentity })}
            data-autofocus='identity added'
          >
            <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
            <span className='grow'>{t('continue label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
          <Button
            disabled={disabled}
            onClick={() => dispatch({ type: 'deselect identity' })}
            className='flex items-center gap-2 pis-2 pie-4'
          >
            <CaretLeft weight='bold' className={getSize(4)} />
            <span>{t('deselect identity label')}</span>
          </Button>
        </div>
      )}
    </ViewState>
  );
};
