//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { CaretLeft, Planet, Plus, Rocket } from 'phosphor-react';
import React from 'react';
import { generatePath, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Space } from '@dxos/client';
import { useClient, useIdentity, useSpace } from '@dxos/react-client';
import { Button, getSize, Heading, JoinSpaceDialog, Presence, Tooltip, useTranslation } from '@dxos/react-uikit';
import { humanize, MaybePromise } from '@dxos/util';

import { useSafeSpaceKey } from '../../hooks';

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

export interface AppLayoutProps {
  homePath?: string;
  spacePath?: string;
  manageSpacePath?: string;
  onSpaceCreate?: (space: Space) => MaybePromise<void>;
}

export const AppLayout = ({
  homePath = '/',
  spacePath = '/spaces/:space',
  manageSpacePath = '/spaces/:space/settings',
  onSpaceCreate
}: AppLayoutProps) => {
  const { t } = useTranslation('appkit');
  const client = useClient();
  const identity = useIdentity();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex, () => navigate(homePath));
  const space = useSpace(spaceKey);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const invitationParam = searchParams.get('invitation');
  const pathSegments = location.pathname.split('/').length;
  const isManagingSpace = !!spaceHex && pathSegments > 3;

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    await onSpaceCreate?.(space);
  };

  return (
    <main className='max-is-5xl mli-auto pli-7'>
      <div role='none' className={cx('flex flex-wrap items-center gap-x-2 gap-y-4 my-4')}>
        {space ? (
          <>
            <Tooltip content={t('back to spaces label')} side='right' tooltipLabelsTrigger>
              <Button compact onClick={() => navigate(homePath)} className='flex gap-1'>
                <CaretLeft className={getSize(4)} />
                <Planet className={getSize(4)} />
              </Button>
            </Tooltip>
            <Heading className='truncate pbe-1'>{humanize(space.key)}</Heading>
            <div role='none' className='grow-[99] min-w-[2rem]' />
            <div role='none' className='grow flex gap-2'>
              {/* TODO(wittjosiah): There probably shouldn't be a popover here, or "manage identity" should link out to HALO. */}
              {/* TODO(wittjosiah): We probably don't want to rely on invitation singleton, dialog version prepping for HALO provide? */}
              <Presence
                profile={identity!}
                space={space}
                className='flex-none'
                size={10}
                sideOffset={4}
                managingSpace={isManagingSpace}
                onClickGoToSpace={() => navigate(generatePath(spacePath, { space: spaceHex }))}
                onClickManageSpace={() => navigate(generatePath(manageSpacePath, { space: spaceHex }))}
              />
            </div>
          </>
        ) : (
          <>
            <Heading>{t('spaces label')}</Heading>
            <div role='none' className='grow-[99] min-w-[2rem]' />
            <div role='none' className='grow flex gap-2'>
              <JoinSpaceDialog
                initialInvitationCode={invitationParam ?? undefined}
                parseInvitation={(invitationCode) => invitationCodeFromUrl(invitationCode)}
                onJoin={(spaceKey) => navigate(generatePath(spacePath, { space: spaceKey.toHex() }))}
                dialogProps={{
                  initiallyOpen: Boolean(invitationParam),
                  openTrigger: (
                    <Button className='grow flex gap-1'>
                      <Rocket className={getSize(5)} />
                      {t('join space label', { ns: 'uikit' })}
                    </Button>
                  )
                }}
              />
              <Button variant='primary' onClick={handleCreateSpace} className='grow flex gap-1'>
                <Plus className={getSize(5)} />
                {t('create space label', { ns: 'uikit' })}
              </Button>
            </div>
          </>
        )}
      </div>

      <Outlet context={{ space }} />
    </main>
  );
};
