//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import { generateName } from '@dxos/display-name';
import type { Identity } from '@dxos/react-client/halo';
import { Avatar, useId, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { hexToFallback } from '@dxos/util';

import { Action, Actions, StepHeading } from '../../../components';
import { type JoinPanelMode, type JoinStepProps } from '../JoinPanelProps';

export interface IdentityAddedProps extends JoinStepProps {
  mode?: JoinPanelMode;
  addedIdentity?: Identity;
}

export const IdentityAdded = (props: IdentityAddedProps) => {
  const { mode, addedIdentity, active, send, onDone, doneActionParent } = props;
  const disabled = !active;
  const { t } = useTranslation('os');

  const addedIdentityHex = addedIdentity?.identityKey.toHex() ?? '0';
  const fallbackValue = hexToFallback(addedIdentityHex);
  const labelId = useId('identityListItem__label');
  const displayName = addedIdentity?.profile?.displayName ?? (addedIdentity && generateName(addedIdentityHex));

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
        <Avatar.Root status='active' labelId={labelId} hue={addedIdentity?.profile?.data?.hue || fallbackValue.hue}>
          <Avatar.Frame>
            <Avatar.Fallback text={addedIdentity?.profile?.data?.emoji || fallbackValue.emoji} />
          </Avatar.Frame>
          <Avatar.Label classNames={mx('text-lg truncate', !addedIdentity?.profile?.displayName && 'font-mono')}>
            {displayName}
          </Avatar.Label>
        </Avatar.Root>
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
            onClick={() => addedIdentity && send({ type: 'selectIdentity', identity: addedIdentity })}
            data-autofocus='confirmingAddedIdentity'
          >
            {t('continue label')}
          </Action>
        )}
      </Actions>
    </>
  );
};
