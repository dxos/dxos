//
// Copyright 2023 DXOS.org
//
import React, { useEffect, useMemo } from 'react';

import { Avatar, DensityProvider, useId, useJdenticonHref, useTranslation } from '@dxos/aurora';
import { log } from '@dxos/log';
import type { Identity } from '@dxos/react-client/halo';
import { useIdentity } from '@dxos/react-client/halo';
import { humanize } from '@dxos/util';

import { Viewport } from '../../components';
import { IdentitySend, useIdentityMachine } from './identityMachine';
import { DeviceManager, IdentityActionChooser } from './steps';

type IdentityPanelHeadingProps = {
  titleId: string;
  identity: Identity;
};

type IdentityPanelImplProps = IdentityPanelHeadingProps & {
  activeView: string;
  send: IdentitySend;
  createInvitationUrl: (invitationCode: string) => string;
};

const IdentityHeading = ({ titleId, identity }: IdentityPanelHeadingProps) => {
  const { t } = useTranslation('os');
  const fallbackHref = useJdenticonHref(identity.identityKey.toHex(), 12);
  return (
    <div role='none'>
      <h2 className='sr-only' id={titleId}>
        {t('identity heading')}
      </h2>
      <Avatar.Root size={12} variant='circle'>
        <Avatar.Frame classNames='block mli-auto'>
          <Avatar.Fallback href={fallbackHref} />
        </Avatar.Frame>
        <Avatar.Label classNames='block text-center font-light text-xl'>
          {identity.profile?.displayName ?? humanize(identity.identityKey)}
        </Avatar.Label>
      </Avatar.Root>
    </div>
  );
};

const IdentityPanelImpl = ({ identity, titleId, activeView, send, createInvitationUrl }: IdentityPanelImplProps) => {
  return (
    <DensityProvider density='fine'>
      <IdentityHeading {...{ identity, titleId }} />
      <Viewport.Root activeView={activeView}>
        <Viewport.Views>
          <Viewport.View id='choosing action'>
            <IdentityActionChooser send={send} />
          </Viewport.View>
          <Viewport.View id='managing devices'>
            <DeviceManager createInvitationUrl={createInvitationUrl} />
          </Viewport.View>
          {/* <Viewport.View id='managing profile'></Viewport.View> */}
          {/* <Viewport.View id='signing out'></Viewport.View> */}
        </Viewport.Views>
      </Viewport.Root>
    </DensityProvider>
  );
};

export type IdentityPanelProps = Partial<Pick<IdentityPanelImplProps, 'titleId' | 'createInvitationUrl'>>;

export const IdentityPanel = ({ titleId: propsTitleId, createInvitationUrl = (code) => code }: IdentityPanelProps) => {
  const titleId = useId('identityPanel__heading', propsTitleId);
  const identity = useIdentity();
  if (!identity) {
    console.error('IdentityPanel rendered with no active identity.');
    return null;
  }
  const [identityState, identitySend, identityService] = useIdentityMachine(identity);

  useEffect(() => {
    const subscription = identityService.subscribe((state) => {
      log('[state]', state);
    });

    return subscription.unsubscribe;
  }, [identityService]);

  const activeView = useMemo(() => {
    switch (true) {
      case identityState.matches('choosingAction'):
        return 'choosing action';
      case identityState.matches('managingDevices'):
        return 'managing devices';
      // case identityState.matches('managingProfile'):
      //   return 'managing profile';
      // case identityState.matches('signingOut'):
      //   return 'signing out';
      default:
        return 'never';
    }
  }, [identityState]);

  return (
    <IdentityPanelImpl
      identity={identity}
      activeView={activeView}
      send={identitySend}
      titleId={titleId}
      createInvitationUrl={createInvitationUrl}
    />
  );
};
