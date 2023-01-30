//
// Copyright 2022 DXOS.org
//

import { Plus, Rocket } from 'phosphor-react';
import React, { useCallback } from 'react';
import { generatePath, useNavigate, useSearchParams } from 'react-router-dom';

import { Invitation, Space } from '@dxos/client';
import { InvitationResult, useClient, useSpaces } from '@dxos/react-client';
import { Button, getSize, useTranslation } from '@dxos/react-components';

import { HeadingWithActions } from '../HeadingWithActions';
import { JoinDialog } from '../Join';
import { SpaceList } from '../SpaceList';

const invitationCodeFromUrl = (url: string) => {
  try {
    const searchParams = new URLSearchParams(url.substring(url.lastIndexOf('?')));
    const invitation = searchParams.get('invitation');
    return invitation ?? url;
  } catch (err) {
    console.error(err);
    return url;
  }
};

export type SpacesPageComponentProps = {
  onSpaceCreate?: () => any;
  onSpaceJoined?: (space: Space) => any;
  spacePath?: string;
};

export const SpacesPageComponent = (props: SpacesPageComponentProps) => {
  const { onSpaceCreate, spacePath } = {
    spacePath: '/spaces/:space',
    ...props
  };
  const { t } = useTranslation('appkit');
  const client = useClient();
  const spaces = useSpaces();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invitationParam = searchParams.get('invitation');

  const acceptInvitation = useCallback((invitation: Invitation) => client.echo.acceptInvitation(invitation), [client]);

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
            <Button variant='primary' onClick={() => onSpaceCreate?.()} className='grow flex gap-1'>
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
