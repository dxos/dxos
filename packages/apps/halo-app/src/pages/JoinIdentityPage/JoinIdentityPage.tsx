//
// Copyright 2022 DXOS.org
//

import { useAsync } from '@react-hook/async';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { InvitationDescriptor } from '@dxos/client';
import { useClient, useProfile } from '@dxos/react-client';
import { Heading, SingleInputStep, useTranslation } from '@dxos/react-uikit';

import { invitationCodeFromUrl } from '../../util';

export const JoinIdentityPage = () => {
  const { t } = useTranslation();
  const client = useClient();
  const profile = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/spaces';
  const invitationParam = searchParams.get('invitation');
  const [invitationCode, setInvitationCode] = useState(invitationParam ?? '');

  const redeemInvitation = useCallback(() => {
    const parsedInvitationCode = invitationCodeFromUrl(invitationCode);
    const invitation = InvitationDescriptor.decode(parsedInvitationCode);
    const redeemeingInvitation = client.halo.acceptInvitation(invitation);
    return redeemeingInvitation.wait();
  }, [invitationCode]);

  const [{ status, cancel, error }, call] = useAsync(redeemInvitation);

  useEffect(() => {
    if (profile) {
      navigate(redirect);
    }
  }, [profile, redirect]);

  useEffect(() => {
    if (invitationParam) {
      void call();
    }
  }, []);

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <Heading>{t('join identity label', { ns: 'uikit' })}</Heading>
      {/* TODO(wittjosiah): Factor out join panel to react-uikit. */}
      <SingleInputStep
        {...{
          pending: status === 'loading',
          inputLabel: t('invitation code label', { ns: 'uikit' }),
          inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
          inputProps: {
            initialValue: invitationCode
          },
          onChange: setInvitationCode,
          onNext: call,
          onCancelPending: cancel,
          onBack: () => history.back(),
          ...(error && {
            inputProps: {
              validationMessage: error.message,
              validationValence: 'error'
            }
          })
        }}
      />
    </main>
  );
};
