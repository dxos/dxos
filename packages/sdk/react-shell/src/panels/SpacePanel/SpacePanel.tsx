//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { DensityProvider, useId } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { log } from '@dxos/log';
import { useInvitationStatus } from '@dxos/react-client/invitations';
import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { Viewport } from '../../components';
import { InvitationManager } from '../../steps';
import { stepStyles } from '../../styles';
import { invitationStatusValue } from '../../util';
import { SpacePanelHeadingProps, SpacePanelImplProps, SpacePanelProps } from './SpacePanelProps';
import { useSpaceMachine } from './spaceMachine';
import { SpaceManager } from './steps';

const SpacePanelHeading = ({ titleId, space }: SpacePanelHeadingProps) => {
  const name = space.properties.name;
  // TODO(wittjosiah): Label this as the space panel.
  return (
    <h2 id={titleId} className={mx('font-medium text-center', !name && 'font-mono')}>
      {name ?? space.key.truncate()}
    </h2>
  );
};

export const SpacePanelImpl = ({ titleId, activeView, space, ...props }: SpacePanelImplProps) => {
  return (
    <DensityProvider density='fine'>
      <SpacePanelHeading {...props} {...{ titleId, space }} />
      <Viewport.Root activeView={activeView}>
        <Viewport.Views>
          <Viewport.View id='space manager' classNames={stepStyles}>
            <SpaceManager active={activeView === 'space manager'} space={space} {...props} />
          </Viewport.View>
          <Viewport.View id='space invitation manager' classNames={stepStyles}>
            <InvitationManager
              active={activeView === 'space invitation manager'}
              {...props}
              invitationUrl={props.invitationUrl}
            />
          </Viewport.View>
        </Viewport.Views>
      </Viewport.Root>
    </DensityProvider>
  );
};

const SpacePanelWithInvitationImpl = ({
  invitation,
  ...props
}: SpacePanelImplProps & { invitation: CancellableInvitationObservable }) => {
  const { status, invitationCode, authCode } = useInvitationStatus(invitation);
  const statusValue = invitationStatusValue.get(status) ?? 0;
  const showAuthCode = statusValue === 3;
  return (
    <SpacePanelImpl
      {...props}
      invitationUrl={props.createInvitationUrl(invitationCode!)}
      {...(showAuthCode && { authCode })}
    />
  );
};

export const SpacePanel = ({
  titleId: propsTitleId,
  createInvitationUrl = (code) => code,
  ...props
}: SpacePanelProps) => {
  const titleId = useId('spacePanel__heading', propsTitleId);

  const [spaceState, spaceSend, spaceService] = useSpaceMachine({ context: { space: props.space } });

  useEffect(() => {
    const subscription = spaceService.subscribe((state) => {
      log('[state]', state);
    });

    return subscription.unsubscribe;
  }, [spaceService]);

  const activeView = useMemo(() => {
    switch (true) {
      case spaceState.matches('managingSpace'):
        return 'space manager';
      case spaceState.matches('managingSpaceInvitation'):
        return 'space invitation manager';
      default:
        return 'never';
    }
  }, [spaceState]);

  const implProps = {
    ...props,
    activeView,
    send: spaceSend,
    titleId,
    createInvitationUrl,
  };

  return spaceState.context.invitation ? (
    <SpacePanelWithInvitationImpl {...implProps} invitation={spaceState.context.invitation} />
  ) : (
    <SpacePanelImpl {...implProps} />
  );
};
