//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import { Avatar, useId, useJdenticonHref, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { generateName } from '@dxos/display-name';
import type { Identity } from '@dxos/react-client/halo';

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

  const fallbackValue = addedIdentity?.identityKey.toHex();
  const labelId = useId('identityListItem__label');
  const jdenticon = useJdenticonHref(fallbackValue ?? '', 12);
  const displayName =
    addedIdentity?.profile?.displayName ?? (addedIdentity && generateName(addedIdentity?.identityKey.toHex()));

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
        <Avatar.Root status='active' labelId={labelId}>
          <Avatar.Frame>
            <Avatar.Fallback href={jdenticon} />
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
