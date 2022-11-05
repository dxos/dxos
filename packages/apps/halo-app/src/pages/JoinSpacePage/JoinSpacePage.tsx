//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Heading, JoinSpacePanel, useTranslation } from '@dxos/react-uikit';

import { invitationCodeFromUrl } from '../../util';

/**
 *
 */
export const JoinSpacePage = () => {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationParam = searchParams.get('invitation');

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <Heading>{t('join space label', { ns: 'uikit' })}</Heading>
      <JoinSpacePanel
        initialInvitationCode={invitationParam ?? undefined}
        parseInvitation={(invitationCode) => invitationCodeFromUrl(invitationCode)}
        onJoin={(space) => navigate(`/spaces/${space.key.toHex()}`)}
      />
    </main>
  );
};
