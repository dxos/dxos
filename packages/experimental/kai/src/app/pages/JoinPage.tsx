//
// Copyright 2022 DXOS.org
//

import { Bug } from 'phosphor-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Trigger } from '@dxos/async';
import { Invitation, InvitationEncoder, PublicKey, Space } from '@dxos/client';
import { useClient } from '@dxos/react-client';
import { mx } from '@dxos/react-ui';

/**
 * Join space via invitation URL.
 */
export const JoinPage = () => {
  const client = useClient();
  const navigate = useNavigate();
  const { invitation: invitationCode } = useParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    let invitation: Invitation;
    try {
      invitation = InvitationEncoder.decode(invitationCode!);
    } catch (err: any) {
      setError(true);
      return;
    }

    const complete = new Trigger<Space | null>();
    const observable = client.echo.acceptInvitation({
      invitationId: PublicKey.random().toHex(), // TODO(dmaretskyi): Why is this required?
      swarmKey: invitation.swarmKey,
      type: Invitation.Type.MULTIUSE_TESTING,
      timeout: 2000 // TODO(dmaretskyi): Doesn't work.
    });

    // TODO(burdon): Error page.
    const unsubscribe = observable.subscribe({
      onSuccess: async () => {
        // TODO(burdon): Space key missing from returned invitation.
        navigate(`/${invitation.spaceKey!.truncate()}`);
      },
      onTimeout: () => {
        console.error('timeout');
        complete.wake(null);
      },
      onError: (error) => {
        console.error(error);
        complete.wake(null);
      }
    });

    return () => {
      unsubscribe();
      void observable.cancel();
    };
  }, [invitationCode]);

  return (
    <div className='full-screen'>
      <div className='flex flex-1 items-center'>
        <div className='flex flex-1 flex-col items-center'>
          <Bug style={{ width: 160, height: 160 }} className={mx(error ? 'text-red-500' : 'text-gray-400')} />
        </div>
      </div>
    </div>
  );
};
