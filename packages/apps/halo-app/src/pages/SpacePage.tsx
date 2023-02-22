//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Identity } from '@dxos/client';
import { useSafeSpaceKey, ProfileList } from '@dxos/react-appkit';
import { useMembers } from '@dxos/react-client';
import { Heading, useTranslation } from '@dxos/react-components';

const SpacePage = () => {
  const { t } = useTranslation('halo');
  const navigate = useNavigate();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate('/'));
  const members = useMembers(spaceKey);
  const memberProfiles = useMemo(
    () => members.map(({ identity }) => identity).filter((identity): identity is Identity => !!identity),
    [members]
  );

  return (
    <>
      <Heading level={2}>{t('space members label', { ns: 'appkit' })}</Heading>
      <ProfileList identities={memberProfiles} />
    </>
  );
};

export default SpacePage;
