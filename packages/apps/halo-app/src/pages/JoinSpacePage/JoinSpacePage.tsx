//
// Copyright 2021 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { InvitationDescriptor } from '@dxos/client';
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
    <main className='max-w-lg mx-auto'>
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
  const [pending, setPending] = useState(false);

  const onNext = useCallback(async () => {
    setPending(true);
    let invitation: InvitationDescriptor;
    try {
      const parsedInvitationCode = invitationCodeFromUrl(invitationCode);
      invitation = InvitationDescriptor.decode(parsedInvitationCode);
      const redeemeingInvitation = client.echo.acceptInvitation(invitation);
      const space = await redeemeingInvitation.getParty();
      navigate(`/spaces/${space.key.toHex()}`);
    } catch (err: any) {
      setPending(false);
      // TODO(wittjosiah): Error rendering.
      console.error(err);
    }
  }, [invitationCode]);

  useEffect(() => {
    if (invitationParam) {
      void onNext();
    }
  }, []);

  return (
    <SingleInputStep
      {...{
        pending,
        inputLabel: t('invitation code label', { ns: 'uikit' }),
        inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
        inputProps: {
          initialValue: invitationCode
        },
        onChange: setInvitationCode,
        onNext
      }}
    />
  );
};
