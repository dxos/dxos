//
// Copyright 2022 DXOS.org
//

import { Plus, Rocket } from 'phosphor-react';
import React, { useCallback } from 'react';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';

import { Invitation, Space } from '@dxos/client';
import { InvitationResult, useClient, useSpaces } from '@dxos/react-client';
import { Button, getSize, useTranslation } from '@dxos/react-ui';
import { MaybePromise } from '@dxos/util';

import { HeadingWithActions } from '../HeadingWithActions';
import { JoinDialog } from '../Join';
import { SpaceList } from '../SpaceList';

const invitationCodeFromUrl = (text: string) => {
  try {
    const searchParams = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    const invitation = searchParams.get('invitation');
    return invitation ?? text;
  } catch (err) {
    console.error(err);
    return text;
  }
};

export const SpacesPage = ({
  onSpaceCreate,
  spacePath = '/spaces/:space'
}: {
  onSpaceCreate?: (space: Space) => MaybePromise<void>;
  spacePath?: string;
}) => {
  const { t } = useTranslation('appkit');
  const client = useClient();
  const spaces = useSpaces();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invitationParam = searchParams.get('invitation');

  const acceptInvitation = useCallback((invitation: Invitation) => client.echo.acceptInvitation(invitation), [client]);

  const handleCreateSpace = useCallback(async () => {
    const space = await client.echo.createSpace();
    await onSpaceCreate?.(space);
  }, [client]);

  const handleJoin = useCallback(
    ({ spaceKey }: InvitationResult) => navigate(generatePath(spacePath, { space: spaceKey!.toHex() })),
    [spacePath]
  );

  return (
    <>
      <HeadingWithActions
        className='flex-auto text-center mbe-4'
        actions={
          <>
            <JoinDialog
              initialInvitationCode={invitationParam ?? undefined}
              parseInvitation={(invitationCode) => invitationCodeFromUrl(invitationCode)}
              onJoin={handleJoin}
              acceptInvitation={acceptInvitation}
              dialogProps={{
                initiallyOpen: Boolean(invitationParam),
                openTrigger: (
                  <Button className='grow flex gap-1'>
                    <Rocket className={getSize(5)} />
                    {t('join space label', { ns: 'appkit' })}
                  </Button>
                )
              }}
            />
            <Button variant='primary' onClick={handleCreateSpace} className='grow flex gap-1'>
              <Plus className={getSize(5)} />
              {t('create space label', { ns: 'appkit' })}
            </Button>
          </>
        }
        heading={{
          children: t('spaces label')
        }}
      />
      <SpaceList spaces={spaces} />
    </>
  );
};
