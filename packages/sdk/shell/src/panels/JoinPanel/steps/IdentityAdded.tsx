//
// Copyright 2023 DXOS.org
//

import React, { cloneElement } from 'react';

import { generateName } from '@dxos/display-name';
import { toPublicKey } from '@dxos/protocols/buf';
import type { Identity } from '@dxos/react-client/halo';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import { mx } from '@dxos/ui-theme';
import { hexToFallback } from '@dxos/util';

import { InputLabel } from '../../../components/index.ts';
import { translationKey } from '../../../translations.ts';
import { profileString } from '../../../util/index.ts';
import { type JoinPanelMode, type JoinStepProps } from '../JoinPanelProps.ts';

export interface IdentityAddedProps extends JoinStepProps {
  mode?: JoinPanelMode;
  addedIdentity?: Identity;
}

export const IdentityAdded = (props: IdentityAddedProps) => {
  const { mode, addedIdentity, active, send, onDone, doneActionParent } = props;
  const disabled = !active;
  const { t } = Hooks.useTranslation(translationKey);

  const addedIdentityHex = toPublicKey(addedIdentity?.identityKey)?.toHex() ?? '0';
  const fallbackValue = hexToFallback(addedIdentityHex);
  const labelId = Hooks.useId('identityListItem__label');
  const displayName = addedIdentity?.profile?.displayName ?? (addedIdentity && generateName(addedIdentityHex));

  const doneAction = (
    <Button.Root
      {...(onDone && { onClick: () => onDone(null) })}
      disabled={disabled}
      data-autofocus='confirmingAddedIdentity'
      data-testid='identity-added-done'
    >
      <span>{t('done.label')}</span>
    </Button.Root>
  );

  return (
    <>
      <InputLabel>{t('identity-added.label')}</InputLabel>
      <div className='grow flex flex-col items-center justify-center text-center gap-2'>
        <Avatar.Root
          aria-labelledby={labelId}
          status='active'
          hue={Avatar.toAvatarHue(profileString(addedIdentity, 'hue') || fallbackValue.hue)}
          fallback={profileString(addedIdentity, 'emoji') || fallbackValue.emoji}
        />
        <span id={labelId} className={mx('text-lg truncate', !addedIdentity?.profile?.displayName && 'font-mono')}>
          {displayName}
        </span>
      </div>
      <Dialog.Footer>
        {mode === 'halo-only' ? (
          doneActionParent ? (
            cloneElement(doneActionParent, {}, doneAction)
          ) : (
            doneAction
          )
        ) : (
          <Button.Root
            variant='primary'
            disabled={disabled || !addedIdentity}
            onClick={() => addedIdentity && send({ type: 'selectIdentity', identity: addedIdentity })}
            data-autofocus='confirmingAddedIdentity'
          >
            {t('continue.label')}
          </Button.Root>
        )}
      </Dialog.Footer>
    </>
  );
};
