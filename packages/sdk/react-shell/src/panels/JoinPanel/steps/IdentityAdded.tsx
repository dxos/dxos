//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight, Check } from '@phosphor-icons/react';
import React, { cloneElement } from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { Avatar } from '@dxos/react-appkit';
import type { Identity } from '@dxos/react-client/halo';

import { PanelAction, PanelStepHeading } from '../../../components';
import { JoinPanelMode, JoinStepProps } from '../JoinPanelProps';
import { LargeButton } from '../../../components/Panel/LargeButton';

export interface IdentityAddedProps extends JoinStepProps {
  mode?: JoinPanelMode;
  addedIdentity?: Identity;
}

export const IdentityAdded = (props: IdentityAddedProps) => {
  const { mode, addedIdentity, active, send, onDone, doneActionParent } = props;
  const disabled = !active;
  const { t } = useTranslation('os');

  const doneAction = (
    <PanelAction
      aria-label={t('done label')}
      {...(onDone && { onClick: () => onDone(null) })}
      disabled={disabled}
      data-autofocus='confirmingAddedIdentity'
      data-testid='identity-added-done'
    >
      <Check weight='light' className={getSize(6)} />
    </PanelAction>
  );

  return (
    <>
      <PanelStepHeading>{t('identity added label')}</PanelStepHeading>
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
      {mode === 'halo-only' ? (
        doneActionParent ? (
          cloneElement(doneActionParent, {}, doneAction)
        ) : (
          doneAction
        )
      ) : (
        <div className='flex gap-2'>
          <LargeButton variant='primary'>Continue</LargeButton>
          {/* <Button
            disabled={disabled || !addedIdentity}
            classNames='grow flex items-center gap-2 pli-2 order-2'
            onClick={() => addedIdentity && send({ type: 'selectIdentity', identity: addedIdentity })}
            data-autofocus='confirmingAddedIdentity'
          >
            <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
            <span className='grow'>{t('continue label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
          <Button
            disabled={disabled}
            onClick={() => send({ type: 'deselectAuthMethod' })}
            classNames='flex items-center gap-2 pis-2 pie-4'
          >
            <CaretLeft weight='bold' className={getSize(4)} />
            <span>{t('deselect identity label')}</span>
          </Button> */}
        </div>
      )}
    </>
  );
};
