//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { InvitationEncoder } from '@dxos/client';
import { useClient, useProfile } from '@dxos/react-client';
import {
  Heading,
  SingleInputStep,
  useTranslation,
  useInvitationStatus,
  InvitationState,
  InvitationWrapper
} from '@dxos/react-uikit';

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

  const { status, cancel, error, connect } = useInvitationStatus();

  const redeemInvitation = useCallback(() => {
    connect(
      client.halo.acceptInvitation(
        InvitationEncoder.decode(invitationCodeFromUrl(invitationCode))
      ) as unknown as InvitationWrapper
    );
  }, [invitationCode]);

  useEffect(() => {
    if (profile) {
      navigate(redirect);
    }
  }, [profile, redirect]);

  useEffect(() => {
    if (invitationParam) {
      void redeemInvitation();
    }
  }, []);

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <Heading>{t('join identity label', { ns: 'uikit' })}</Heading>
      <SingleInputStep
        {...{
          pending: status === InvitationState.CONNECTING || status === InvitationState.AUTHENTICATING,
          inputLabel: t('invitation code label', { ns: 'uikit' }),
          inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
          inputProps: {
            initialValue: invitationCode
          },
          onChange: setInvitationCode,
          onNext: redeemInvitation,
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
