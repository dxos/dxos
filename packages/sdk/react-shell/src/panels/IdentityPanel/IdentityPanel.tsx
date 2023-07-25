//
// Copyright 2023 DXOS.org
//
import React, { useEffect, useMemo } from 'react';
import { Event, SingleOrArray } from 'xstate';

import { Avatar, DensityProvider, useId, useJdenticonHref, useTranslation } from '@dxos/aurora';
import { log } from '@dxos/log';
import type { Identity } from '@dxos/react-client/halo';
import { useIdentity } from '@dxos/react-client/halo';
import { humanize } from '@dxos/util';

import { Viewport } from '../../components';
import { IdentityEvent, useIdentityMachine } from './identityMachine';
import { DeviceManager, IdentityActionChooser } from './steps';

type IdentityPanelHeadingProps = {
  titleId: string;
  identity: Identity;
};

export type IdentityPanelImplProps = IdentityPanelHeadingProps & {
  activeView: string;
  send: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  createInvitationUrl: (invitationCode: string) => string;
};

const IdentityHeading = ({ titleId, identity }: IdentityPanelHeadingProps) => {
  const { t } = useTranslation('os');
  const fallbackHref = useJdenticonHref(identity.identityKey.toHex(), 12);
  return (
    <div role='none' className='mbs-1 mbe-2'>
      <h2 className='sr-only' id={titleId}>
        {t('identity heading')}
      </h2>
      <Avatar.Root size={12} variant='circle'>
        <Avatar.Frame classNames='block mli-auto mlb-2'>
          <Avatar.Fallback href={fallbackHref} />
        </Avatar.Frame>
        <Avatar.Label classNames='block text-center font-light text-xl mlb-2'>
          {identity.profile?.displayName ?? humanize(identity.identityKey)}
        </Avatar.Label>
      </Avatar.Root>
    </div>
  );
};

export const IdentityPanelImpl = ({
  identity,
  titleId,
  activeView,
  send,
  createInvitationUrl,
}: IdentityPanelImplProps) => {
  return (
    <DensityProvider density='fine'>
      <IdentityHeading {...{ identity, titleId }} />
      <Viewport.Root activeView={activeView}>
        <Viewport.Views>
          <Viewport.View id='identity action chooser' classNames='justify-center gap-1'>
            <IdentityActionChooser send={send} />
          </Viewport.View>
          <Viewport.View id='device manager'>
            <DeviceManager createInvitationUrl={createInvitationUrl} />
          </Viewport.View>
          {/* <Viewport.View id='managing profile'></Viewport.View> */}
          {/* <Viewport.View id='signing out'></Viewport.View> */}
        </Viewport.Views>
      </Viewport.Root>
    </DensityProvider>
  );
};

export type IdentityPanelProps = Partial<
  Pick<IdentityPanelImplProps, 'titleId' | 'createInvitationUrl'> & { onDone?: () => void }
>;

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
        return 'identity action chooser';
      case identityState.matches('managingDevices'):
        return 'device manager';
      // case identityState.matches('managingProfile'):
      //   return 'profile manager';
      // case identityState.matches('signingOut'):
      //   return 'identity exit';
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
