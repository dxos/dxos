//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { InvitationDescriptor } from '@dxos/client';
import { useClient, useSecretProvider } from '@dxos/react-client';
import {
  Heading,
  Main,
  SingleInputStep,
  useTranslation
} from '@dxos/react-uikit';

const textEncoder = new TextEncoder();
const invitationCodeFromUrl = (text: string) =>
  text.substring(text.lastIndexOf('/') + 1);

export const InviteDevicePage = () => {
  const { t } = useTranslation();
  const client = useClient();
  const [secretProvider, secretResolver, _resetSecret] =
    useSecretProvider<Uint8Array>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/spaces';
  const invitationParam = searchParams.get('invitation');
  const [invitationCodeEntered, setInvitationCodeEntered] = useState(
    Boolean(invitationParam)
  );
  const [invitationCode, setInvitationCode] = useState(invitationParam ?? '');
  const [pin, setPin] = useState('');
  const [pending, setPending] = useState(false);

  const onNextInvitation = useCallback(async () => {
    let invitation: InvitationDescriptor;
    try {
      const parsedInvitationCode = invitationCodeFromUrl(invitationCode);
      invitation = InvitationDescriptor.decode(parsedInvitationCode);
      setInvitationCodeEntered(true);
      const acceptedInvitation = await client.halo.acceptInvitation(invitation);
      console.log({ acceptedInvitation });
      const secret = await secretProvider();
      console.log({ secret });
      await acceptedInvitation.authenticate(secret);
      console.log('accepted');
      navigate(redirect);
    } catch (err: any) {
      // TODO(wittjosiah): Error rendering.
      console.error(err);
    }
  }, [invitationCode]);

  const onNextPin = useCallback(() => {
    setPending(true);
    secretResolver(textEncoder.encode(pin));
  }, [pin]);

  return (
    <Main className='max-w-lg mx-auto'>
      <Heading>{t('invite device label', { ns: 'uikit' })}</Heading>
      {/* TODO(wittjosiah): Factor out join panel to react-uikit. */}
      {!invitationCodeEntered && (
        <SingleInputStep
          {...{
            pending,
            inputLabel: t('invitation code label', { ns: 'uikit' }),
            inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
            onChange: setInvitationCode,
            onNext: onNextInvitation,
            onBack: () => history.back()
          }}
        />
      )}
      {/* TODO(wittjosiah): Migrate Passcode from react-components to react-ui. */}
      {invitationCodeEntered && (
        <SingleInputStep
          {...{
            pending,
            inputLabel: t('invitation pin label', { ns: 'uikit' }),
            inputPlaceholder: t('invitation pin placeholder', { ns: 'uikit' }),
            onChange: setPin,
            onNext: onNextPin,
            onBack: () => setInvitationCodeEntered(false)
          }}
        />
      )}
    </Main>
  );
};
