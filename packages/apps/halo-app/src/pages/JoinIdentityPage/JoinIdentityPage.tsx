//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { InvitationDescriptor } from '@dxos/client';
import { useClient, useProfile } from '@dxos/react-client';
import { Heading, SingleInputStep, useTranslation } from '@dxos/react-uikit';

// TODO(wittjosiah): Factor out.
const invitationCodeFromUrl = (text: string) => {
  try {
    const searchParams = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    const invitation = searchParams.get('invitation');
    console.log({ invitation, searchParams });
    return invitation ?? text;
  } catch (err) {
    console.log(err);
    return text;
  }
};

export const JoinIdentityPage = () => {
  const { t } = useTranslation();
  const client = useClient();
  const profile = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/spaces';
  const invitationParam = searchParams.get('invitation');
  const [invitationCode, setInvitationCode] = useState(invitationParam ?? '');
  const [pending, setPending] = useState(false);

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

  useEffect(() => {
    if (profile) {
      navigate(redirect);
    }
  }, [profile, redirect]);

  useEffect(() => {
    if (invitationParam) {
      void onNext();
    }
  }, []);

  return (
    <main className='max-is-lg mli-auto pli-7'>
      <Heading>{t('join identity label', { ns: 'uikit' })}</Heading>
      {/* TODO(wittjosiah): Factor out join panel to react-uikit. */}
      <SingleInputStep
        {...{
          pending,
          inputLabel: t('invitation code label', { ns: 'uikit' }),
          inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
          inputProps: {
            initialValue: invitationCode
          },
          onChange: setInvitationCode,
          onNext,
          onBack: () => history.back()
        }}
      />
    </main>
  );
};
