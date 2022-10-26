//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { InvitationDescriptor } from '@dxos/client';
import { useClient, useProfile } from '@dxos/react-client';
import {
  Heading,
  Main,
  SingleInputStep,
  useTranslation
} from '@dxos/react-uikit';

const invitationCodeFromUrl = (text: string) =>
  text.substring(text.lastIndexOf('/') + 1);

export const InviteDevicePage = () => {
  const { t } = useTranslation();
  const client = useClient();
  const profile = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/spaces';
  const invitationParam = searchParams.get('invitation');
  const [invitationCode, setInvitationCode] = useState(invitationParam ?? '');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (profile) {
      navigate(redirect);
    }
  }, [profile, redirect]);

  const onNext = useCallback(async () => {
    setPending(true);
    let invitation: InvitationDescriptor;
    try {
      const parsedInvitationCode = invitationCodeFromUrl(invitationCode);
      invitation = InvitationDescriptor.decode(parsedInvitationCode);
      await client.halo.acceptInvitation(invitation);
    } catch (err: any) {
      setPending(false);
      // TODO(wittjosiah): Error rendering.
      console.error(err);
    }
  }, [invitationCode]);

  return (
    <Main className='max-w-lg mx-auto'>
      <Heading>{t('invite device label', { ns: 'uikit' })}</Heading>
      {/* TODO(wittjosiah): Factor out join panel to react-uikit. */}
      <SingleInputStep
        {...{
          pending,
          inputLabel: t('invitation code label', { ns: 'uikit' }),
          inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
          onChange: setInvitationCode,
          onNext,
          onBack: () => history.back()
        }}
      />
    </Main>
  );
};
