//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useMounted } from '@dxos/react-async';
import { JoinPartyDialog } from '@dxos/react-toolkit';

import { getPath } from '../../paths';

/**
 * Renders JoinPartyDialog, automatically setting the invitation code if available.
 * Redirects to index route on close.
 */
export const InvitationPage = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const isMounted = useMounted();

  const redirect = (path: string) => {
    // Wait to close.
    setImmediate(() => {
      isMounted() && navigate(path);
    });
  };

  // http://localhost:8080/#/invitation/code?invitation=1
  return (
    <JoinPartyDialog
      open
      invitationCode={code}
      onJoin={party => redirect(getPath(party.key))}
      onClose={() => redirect('/')}
    />
  );
};
