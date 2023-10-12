//
// Copyright 2022 DXOS.org
//

import { Plus, Rocket } from '@phosphor-icons/react';
import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useClient } from '@dxos/react-client';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { type InvitationResult } from '@dxos/react-client/invitations';

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
  onSpaceCreated?: (space: Space) => any;
  onSpaceJoined?: (result: InvitationResult) => any;
};

export const SpacesPageComponent = (props: SpacesPageComponentProps) => {
  const { onSpaceCreated, onSpaceJoined } = props;
  const { t } = useTranslation('appkit');
  const client = useClient();
  const spaces = useSpaces();
  const [searchParams] = useSearchParams();

  const invitationParam = searchParams.get('invitation');

  return (
    <>
      <HeadingWithActions
        className='flex-auto text-center mbe-4'
        actions={
          <>
            <JoinDialog
              initialInvitationCode={invitationParam ?? undefined}
              parseInvitation={(invitationCode) => invitationCodeFromUrl(invitationCode)}
              onJoin={(result) => onSpaceJoined?.(result)}
              acceptInvitation={(invitation) => client.spaces.join(invitation)}
              dialogProps={{
                defaultOpen: Boolean(invitationParam),
                openTrigger: (
                  <Button classNames='grow flex gap-1'>
                    <Rocket className={getSize(5)} />
                    {t('join space label', { ns: 'appkit' })}
                  </Button>
                ),
              }}
            />
            <Button
              variant='primary'
              onClick={async () => {
                const space = await client.spaces.create();
                onSpaceCreated?.(space);
              }}
              classNames='grow flex gap-1'
            >
              <Plus className={getSize(5)} />
              {t('create space label', { ns: 'appkit' })}
            </Button>
          </>
        }
        heading={{
          children: t('spaces label'),
        }}
      />

      <SpaceList spaces={spaces} />
    </>
  );
};
