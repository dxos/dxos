//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Invitation, InvitationEncoder } from '@dxos/client';
import { useClient, useIdentity, useInvitationStatus } from '@dxos/react-client';
import { Heading, SingleInputStep, useTranslation } from '@dxos/react-uikit';

import { invitationCodeFromUrl } from '../../util';

export const JoinIdentityPage = () => {
  const { t } = useTranslation();
  const client = useClient();
  const identity = useIdentity();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationParam = searchParams.get('invitation');
  const [invitationCode, setInvitationCode] = useState(invitationParam ?? '');
  const redirectUrl = searchParams.get('redirect') ?? '/spaces';
  const redirect = useCallback(
    () => (redirectUrl.startsWith('http') ? window.location.replace(redirectUrl) : navigate(redirectUrl)),
    [redirectUrl]
  );

  const { status, cancel, error, connect } = useInvitationStatus();

  const acceptInvitation = useCallback(async () => {
    const invitation = await client.halo.acceptInvitation(
      InvitationEncoder.decode(invitationCodeFromUrl(invitationCode))
    );
    connect(invitation);
    // TODO(wittjosiah): Call redirect on invitaton success.
  }, [invitationCode]);

  useEffect(() => {
    if (identity) {
      redirect();
    }
  }, []);

  useEffect(() => {
    if (invitationParam) {
      void acceptInvitation();
    }
  }, []);

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <Heading>{t('join identity label', { ns: 'uikit' })}</Heading>
      <SingleInputStep
        {...{
          pending: status === Invitation.State.CONNECTING || status === Invitation.State.AUTHENTICATING,
          inputLabel: t('invitation code label', { ns: 'uikit' }),
          inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
          inputProps: {
            initialValue: invitationCode
          },
          onChange: setInvitationCode,
          onNext: acceptInvitation,
          onCancelPending: cancel,
          onBack: () => history.back(),
          ...(error && {
            inputProps: {
              validationMessage: error,
              validationValence: 'error'
            }
          })
        }}
      />
    </main>
  );
};
