//
// Copyright 2023 DXOS.org
//
import React, { useEffect, useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { useInvitationStatus } from '@dxos/react-client/invitations';
import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';
import { Avatar, DensityProvider, useId, useJdenticonHref, useTranslation } from '@dxos/react-ui';

import {
  type IdentityPanelHeadingProps,
  type IdentityPanelImplProps,
  type IdentityPanelProps,
} from './IdentityPanelProps';
import { useIdentityMachine } from './identityMachine';
import { IdentityActionChooser, ProfileForm } from './steps';
import { Viewport, Heading, CloseButton } from '../../components';
import { InvitationManager } from '../../steps';

const viewStyles = 'pbs-1 pbe-3 pli-3';

const IdentityHeading = ({ titleId, title, identity, onDone }: IdentityPanelHeadingProps) => {
  const fallbackHref = useJdenticonHref(identity.identityKey.toHex(), 12);
  return (
    <Heading titleId={titleId} title={title} corner={<CloseButton onDone={onDone} />}>
      <Avatar.Root size={12} variant='circle'>
        <Avatar.Frame classNames='block mbs-4 mbe-2 mli-auto chromatic-ignore'>
          <Avatar.Fallback href={fallbackHref} />
        </Avatar.Frame>
        <Avatar.Label classNames='block text-center font-light text-xl'>
          {identity.profile?.displayName ?? generateName(identity.identityKey.toHex())}
        </Avatar.Label>
      </Avatar.Root>
    </Heading>
  );
};

export const IdentityPanelImpl = (props: IdentityPanelImplProps) => {
  const {
    identity,
    titleId,
    activeView,
    onUpdateProfile,
    IdentityActionChooser: IdentityActionChooserComponent = IdentityActionChooser,
    InvitationManager: InvitationManagerComponent = InvitationManager,
    onDone,
    ...rest
  } = props;
  const { t } = useTranslation('os');
  const title = useMemo(() => {
    switch (activeView) {
      case 'device manager':
      case 'device invitation manager':
        return t('choose devices label');
      default:
        return t('identity heading');
    }
  }, [activeView, t]);
  return (
    <DensityProvider density='fine'>
      <IdentityHeading {...{ identity, titleId, title, onDone }} />
      <Viewport.Root activeView={activeView}>
        <Viewport.Views>
          <Viewport.View id='identity action chooser' classNames={viewStyles}>
            <IdentityActionChooserComponent active={activeView === 'identity action chooser'} {...rest} />
          </Viewport.View>
          <Viewport.View id='device invitation manager' classNames={viewStyles}>
            <InvitationManagerComponent
              active={activeView === 'device invitation manager'}
              {...rest}
              invitationUrl={rest.createInvitationUrl(rest.invitationCode!)}
            />
          </Viewport.View>
          <Viewport.View classNames={viewStyles} id='update profile form'>
            <ProfileForm
              send={rest.send}
              active={activeView === 'update profile form'}
              profile={identity.profile}
              onUpdateProfile={onUpdateProfile}
            />
          </Viewport.View>
          {/* <Viewport.View id='signing out'></Viewport.View> */}
        </Viewport.Views>
      </Viewport.Root>
    </DensityProvider>
  );
};

const IdentityPanelWithInvitationImpl = ({
  invitation,
  ...props
}: IdentityPanelImplProps & { invitation: CancellableInvitationObservable }) => {
  const invitationStatus = useInvitationStatus(invitation);
  return <IdentityPanelImpl {...props} {...invitationStatus} />;
};

export const IdentityPanel = ({
  titleId: propsTitleId,
  createInvitationUrl = (code) => code,
  ...props
}: IdentityPanelProps) => {
  const titleId = useId('identityPanel__heading', propsTitleId);
  const client = useClient();
  const identity = useIdentity();
  if (!identity) {
    console.error('IdentityPanel rendered with no active identity.');
    return null;
  }
  const [identityState, identitySend, identityService] = useIdentityMachine(client);

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
      case identityState.matches('managingDeviceInvitation'):
        return 'device invitation manager';
      case [{ managingProfile: 'idle' }, { managingProfile: 'pending' }].some(identityState.matches):
        return 'update profile form';
      // case identityState.matches('signingOut'):
      //   return 'identity exit';
      default:
        return 'identity action chooser';
    }
  }, [identityState]);

  const onUpdateProfile = async (profile: NonNullable<Identity['profile']>) => {
    identitySend({ type: 'updateProfile' });
    await client.halo.updateProfile(profile);
  };

  const implProps = {
    ...props,
    identity,
    activeView,
    send: identitySend,
    titleId,
    createInvitationUrl,
    onUpdateProfile,
  } satisfies IdentityPanelImplProps;

  return identityState.context.invitation ? (
    <IdentityPanelWithInvitationImpl {...implProps} invitation={identityState.context.invitation} />
  ) : (
    <IdentityPanelImpl {...implProps} />
  );
};
