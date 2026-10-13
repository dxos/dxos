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
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
import { hexToFallback } from '@dxos/util';

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
      <Dialog.Body gap='md'>
        <Typography.Text tone='muted'>{t('identity-added.label')}</Typography.Text>
        <Layout.Flex gap='sm' align='center'>
          <Avatar.Root
            aria-labelledby={labelId}
            status='active'
            hue={Avatar.toAvatarHue(profileString(addedIdentity, 'hue') || fallbackValue.hue)}
            fallback={profileString(addedIdentity, 'emoji') || fallbackValue.emoji}
          />
          <Typography.Text asChild truncate mono={!addedIdentity?.profile?.displayName}>
            <span id={labelId}>{displayName}</span>
          </Typography.Text>
        </Layout.Flex>
      </Dialog.Body>
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
