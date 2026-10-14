//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import React, { useState } from 'react';
import { type Event, type SingleOrArray } from 'xstate';

import { log } from '@dxos/log';
import { toPublicKey } from '@dxos/protocols/buf';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Identity } from '@dxos/react-client/halo';
import { EmojiPickerBlock, HuePicker } from '@dxos/react-ui-pickers';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
import { hexToEmoji, hexToHue } from '@dxos/util';

import { translationKey } from '../../../translations.ts';
import { profileString } from '../../../util/index.ts';
import { type IdentityEvent } from '../identityMachine.ts';
import { type IdentityPanelStepProps } from '../IdentityPanelProps.ts';

export type ProfileFormProps = Omit<IdentityPanelStepProps, 'send' | 'devices'> & {
  send?: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  onUpdateProfile?: (profile: NonNullable<Identity['profile']>) => Promise<void>;
  identity?: Identity;
};

export const ProfileForm = (props: ProfileFormProps) => {
  const { onUpdateProfile } = props;
  const { t } = Hooks.useTranslation(translationKey);
  const [validationMessage, setValidationMessage] = useState('');
  const handleUpdateProfile = async (profile: NonNullable<Identity['profile']>) => {
    await onUpdateProfile?.(profile).catch((error) => {
      log.catch(error);
      setValidationMessage(t('failed-to-update-profile.message'));
    });
  };

  return <ProfileFormImpl {...props} onUpdateProfile={handleUpdateProfile} validationMessage={validationMessage} />;
};

export type ProfileFormImplProps = ProfileFormProps & {
  validationMessage?: string;
};

const ProfileFormImpl = ({ active, identity, send, onUpdateProfile, validationMessage }: ProfileFormImplProps) => {
  const profile = identity?.profile;
  const disabled = !active;
  const { t } = Hooks.useTranslation(translationKey);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [hue, setHue] = useState<string>(getHueValue(identity));
  const [emoji, setEmoji] = useState<string>(getEmojiValue(identity));
  const identityKeyHex = identityHex(identity);
  // Confirmed only once the write resolves, since `writeText` rejects without focus or permission.
  const [copiedKey, setCopiedKey] = useState<string>();
  const copied = copiedKey !== undefined && copiedKey === identityKeyHex;
  return (
    <>
      <Dialog.Body gap='md'>
        {/* An error shows only on an invalid field. */}
        <Field.Root {...(validationMessage && { validationValence: 'error' })}>
          <Field.Label>{t('display-name-input.label')}</Field.Label>
          <Input.Root
            disabled={disabled}
            data-testid='display-name-input'
            placeholder={t('display-name-input.placeholder')}
            value={displayName}
            onChange={({ target: { value } }) => setDisplayName(value)}
          />
          {validationMessage && <Field.ErrorText>{validationMessage}</Field.ErrorText>}
        </Field.Root>
        <Typography.Text tone='muted'>{t('emoji-and-color.label')}</Typography.Text>
        <Layout.Flex gap='sm' align='center'>
          <EmojiPickerBlock
            emoji={emoji}
            onChangeEmoji={setEmoji}
            disabled={disabled}
            onClickClear={() => setEmoji(getEmojiValue(identity))}
          />
          <HuePicker disabled={disabled} value={hue} onChange={setHue} onReset={() => setHue(getHueValue(identity))} />
        </Layout.Flex>
      </Dialog.Body>
      <Dialog.Footer>
        <Button.Root
          variant='ghost'
          disabled={disabled}
          onClick={() => {
            if (identityKeyHex) {
              void navigator.clipboard.writeText(identityKeyHex).then(
                () => setCopiedKey(identityKeyHex),
                () => setCopiedKey(undefined),
              );
            }
          }}
          data-testid='update-profile-form-copy-key'
        >
          {t(copied ? 'copy-success.label' : 'copy-self-did.label')}
        </Button.Root>
        <Button.Root
          variant='ghost'
          disabled={disabled}
          onClick={() => send?.({ type: 'unchooseAction' })}
          data-testid='update-profile-form-back'
        >
          {t('back.label')}
        </Button.Root>
        <Button.Root
          variant='primary'
          disabled={disabled}
          onClick={() =>
            onUpdateProfile?.(
              create(ProfileDocumentSchema, {
                ...(displayName && { displayName }),
                ...((emoji || hue) && { data: { ...(emoji && { emoji }), ...(hue && { hue }) } }),
              }),
            )
          }
          data-testid='update-profile-form-continue'
        >
          {t('done.label')}
        </Button.Root>
      </Dialog.Footer>
    </>
  );
};

const identityHex = (identity?: Identity) => toPublicKey(identity?.identityKey)?.toHex() ?? '0';

const getHueValue = (identity?: Identity) => profileString(identity, 'hue') || hexToHue(identityHex(identity));
const getEmojiValue = (identity?: Identity) => profileString(identity, 'emoji') || hexToEmoji(identityHex(identity));
