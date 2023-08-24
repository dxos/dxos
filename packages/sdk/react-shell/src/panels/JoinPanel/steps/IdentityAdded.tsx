//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import { useTranslation } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { Avatar } from '@dxos/react-appkit';
import type { Identity } from '@dxos/react-client/halo';

import { Action, Actions, StepHeading } from '../../../components';
import { JoinPanelMode, JoinStepProps } from '../JoinPanelProps';

export interface IdentityAddedProps extends JoinStepProps {
  mode?: JoinPanelMode;
  addedIdentity?: Identity;
}

export const IdentityAdded = (props: IdentityAddedProps) => {
  const { mode, addedIdentity, active, send, onDone, doneActionParent } = props;
  const disabled = !active;
  const { t } = useTranslation('os');

  const doneAction = (
    <Action
      {...(onDone && { onClick: () => onDone(null) })}
      disabled={disabled}
      data-autofocus='confirmingAddedIdentity'
      data-testid='identity-added-done'
    >
      <span>{t('done label')}</span>
    </Action>
  );

  return (
    <>
      <StepHeading>{t('identity added label')}</StepHeading>
      <div role='none' className='grow flex flex-col items-center justify-center text-center gap-2'>
        <Avatar
          size={20}
          fallbackValue={addedIdentity?.identityKey.toHex() ?? ''}
          label={
            <p className={mx('text-lg', !addedIdentity?.profile?.displayName && 'font-mono')}>
              {addedIdentity?.profile?.displayName ?? addedIdentity?.identityKey.truncate() ?? ' '}
            </p>
          }
          variant='circle'
          status='active'
        />
      </div>
      <Actions>
        {mode === 'halo-only' ? (
          doneActionParent ? (
            cloneElement(doneActionParent, {}, doneAction)
          ) : (
            doneAction
          )
        ) : (
          <Action
            variant='primary'
            disabled={disabled || !addedIdentity}
            onClick={() => addedIdentity && send({ type: 'setIdentity', identity: addedIdentity })}
            data-autofocus='confirmingAddedIdentity'
          >
            {t('continue label')}
          </Action>
        )}
      </Actions>
    </>
  );
};
