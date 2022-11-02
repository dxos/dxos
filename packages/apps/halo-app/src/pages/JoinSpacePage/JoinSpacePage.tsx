//
// Copyright 2021 DXOS.org
//

import { useAsync } from '@react-hook/async';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { InvitationDescriptor, Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { Dialog, DialogProps, Heading, SingleInputStep, useTranslation } from '@dxos/react-uikit';

// TODO(wittjosiah): Factor out.
const invitationCodeFromUrl = (text: string) => {
  try {
    const searchParams = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    const invitation = searchParams.get('invitation');
    return invitation ?? text;
  } catch (err) {
    console.log(err);
    return text;
  }
};

/**
 *
 */
export const JoinSpacePage = () => {
  const { t } = useTranslation();

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <Heading>{t('join space label', { ns: 'uikit' })}</Heading>
      <JoinSpacePanel />
    </main>
  );
};

// TODO(wittjosiah): Factor out.
export const JoinSpaceDialog = (props: Partial<DialogProps>) => {
  const { t } = useTranslation();

  return (
    <Dialog title={t('join space label', { ns: 'uikit' })} {...props}>
      <JoinSpacePanel />
    </Dialog>
  );
};

// TODO(wittjosiah): Factor out.
const JoinSpacePanel = () => {
  const { t } = useTranslation();
  const client = useClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationParam = searchParams.get('invitation');
  const [invitationCode, setInvitationCode] = useState(invitationParam ?? '');

  const redeemInvitation = useCallback(() => {
    const parsedInvitationCode = invitationCodeFromUrl(invitationCode);
    const invitation = InvitationDescriptor.decode(parsedInvitationCode);
    const redeemeingInvitation = client.echo.acceptInvitation(invitation);
    return redeemeingInvitation.getParty();
  }, [navigate, invitationCode]);

  const [{ status, cancel, error, value }, call] = useAsync<Party>(redeemInvitation);

  useEffect(() => {
    if (invitationParam) {
      void call();
    }
  }, []);

  useEffect(() => {
    if (status === 'success' && value) {
      navigate(`#/spaces/${value.key.toHex()}`);
    }
  }, [status, value]);

  return (
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
        ...(error && {
          inputProps: {
            validationMessage: error.message,
            validationValence: 'error'
          }
        })
      }}
    />
  );
};
