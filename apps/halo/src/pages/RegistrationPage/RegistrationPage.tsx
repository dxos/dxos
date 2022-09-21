//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { Client, Party } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useClient, useProfile } from '@dxos/react-client';
import { JoinHaloDialog, RegistrationDialog } from '@dxos/react-toolkit';

const createPath = (partyKey?: PublicKey, itemId?: string) => {
  const parts = [];
  if (partyKey) {
    parts.push(partyKey.toHex());
    if (itemId) {
      parts.push(itemId);
    }
  }

  return '/' + parts.join('/');
};

export interface RegistrationPageProps {
  onRegister?: (client: Client) => Promise<Party>
}

/**
 * Renders RegistrationDialog if no profile is present otherwise redirects.
 */
export const RegistrationPage = ({ onRegister }: RegistrationPageProps) => {
  const client = useClient();
  const profile = useProfile();

  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const redirect = pathname.split('/').slice(2).join('/');

  const [registerOpen, setRegisterOpen] = useState(true);
  const [haloOpen, setHaloOpen] = useState(false);

  // TODO(burdon): Port back to braneframe-app.
  if (profile) {
    return (
      <Navigate to='/' />
    );
  }

  return (
    <>
      <JoinHaloDialog
        open={haloOpen}
        closeOnSuccess
        onClose={() => {
          setHaloOpen(false);
          setRegisterOpen(true);
        }}
        onJoin={async () => {
          const party = await onRegister?.(client);

          // Close before navigate away.
          setHaloOpen(false);

          // Wait to close.
          setImmediate(() => {
            // TODO(burdon): Factor out (all apps).
            const path = redirect ? `/${redirect}${search}` : createPath(party?.key);
            navigate(path);
          });
        }}
      />
      {/* TODO(wittjosiah): Warning: Can't perform a React state update on an unmounted component. */}
      <RegistrationDialog
        open={registerOpen}
        onJoinHalo={() => {
          setRegisterOpen(false);
          setHaloOpen(true);
        }}
        onRestore={async seedphrase => {
          await client.halo.createProfile({ seedphrase });

          setRegisterOpen(false);

          setImmediate(() => {
            navigate(`/${redirect}${search}`);
          });
        }}
        onComplete={async (_: string, username: string) => {
          // Create profile.
          // TODO(burdon): Error handling.
          await client.halo.createProfile({ username });
          const party = await onRegister?.(client);

          // Close before navigate away.
          setRegisterOpen(false);

          // Wait to close.
          setImmediate(() => {
            // TODO(burdon): Factor out (all apps).
            const path = redirect ? `/${redirect}${search}` : createPath(party?.key);
            navigate(path);
          });
        }}
      />
    </>
  );
};
