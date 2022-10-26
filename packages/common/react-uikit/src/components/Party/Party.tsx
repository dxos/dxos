//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import urlJoin from 'url-join';

import { Party as NaturalParty } from '@dxos/client';
import { usePartyInvitations } from '@dxos/react-client';
import { Loading, QrCode } from '@dxos/react-ui';

export interface PartyProps {
  party: NaturalParty;
  createInvitationUrl?: (invitationCode: string) => string;
}

// TODO(wittjosiah): Remove.
const defaultCreateUrl = (invitationCode: string) => {
  const invitationPath = '/invitation'; // App-specific.
  const { origin, pathname } = window.location;
  return urlJoin(
    origin,
    pathname,
    `/#${invitationPath}`,
    `?code=${invitationCode}`
  );
};

export const PartyInviteSingleton = ({
  createInvitationUrl = defaultCreateUrl,
  party
}: PartyProps) => {
  const { t } = useTranslation();
  const invitations = usePartyInvitations(party.key);

  useEffect(() => {
    if (invitations.length < 1) {
      void party.createInvitation();
    }
  }, [party, invitations]);

  // TODO(wittjosiah): This should re-generate once it is used.
  const invitationUrl = useMemo(
    () =>
      invitations[0] &&
      createInvitationUrl(invitations[0].descriptor.encode().toString()),
    [invitations]
  );

  return invitationUrl ? (
    <QrCode
      size={40}
      value={invitationUrl}
      label={t('copy invite code label', { ns: 'halo' })}
      side='left'
      className='w-full h-auto'
    />
  ) : (
    <Loading label={t('generic loading label')} size='md' />
  );
};

export const Party = (props: PartyProps) => {
  return (
    <>
      <PartyInviteSingleton {...props} />
    </>
  );
};
