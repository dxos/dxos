//
// Copyright 2021 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { InvitationDescriptor } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import {
  Heading,
  Main,
  SingleInputStep,
  useTranslation
} from '@dxos/react-uikit';

// TODO(wittjosiah): Factor out.
const invitationCodeFromUrl = (text: string) => {
  try {
    const url = new URL(text);
    const invitation = url.searchParams.get('invitation');
    return invitation ?? text;
  } catch {
    return text;
  }
};

/**
 *
 */
export const SpaceInvitationPage = () => {
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
    <Main className='max-w-lg mx-auto'>
      <Heading>{t('join space label', { ns: 'uikit' })}</Heading>
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
          onNext
        }}
      />
    </Main>
  );
};
