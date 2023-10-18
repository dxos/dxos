//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { Avatar, DensityProvider, useId, useJdenticonHref, useTranslation } from '@dxos/aurora';
import { log } from '@dxos/log';
import { useInvitationStatus } from '@dxos/react-client/invitations';
import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { type SpacePanelHeadingProps, type SpacePanelImplProps, type SpacePanelProps } from './SpacePanelProps';
import { useSpaceMachine } from './spaceMachine';
import { SpaceManager } from './steps';
import { Heading, CloseButton, Viewport } from '../../components';
import { InvitationManager } from '../../steps';
import { stepStyles } from '../../styles';

const SpacePanelHeading = ({ titleId, space, onDone }: SpacePanelHeadingProps) => {
  const { t } = useTranslation('os');
  const name = space.properties.name;
  const fallbackHref = useJdenticonHref(space.key.toHex(), 8);
  return (
    <Heading
      titleId={titleId}
      title={t('space panel heading')}
      corner={<CloseButton data-testid='identity-panel-done' onDone={onDone} />}
    >
      <Avatar.Root variant='square' size={8}>
        <div role='none' className='flex gap-4 items-center justify-center mlb-4'>
          <Avatar.Frame>
            <Avatar.Fallback href={fallbackHref} />
          </Avatar.Frame>
          <Avatar.Label classNames='block text-start font-light text-xl'>{name ?? space.key.truncate()}</Avatar.Label>
        </div>
      </Avatar.Root>
    </Heading>
  );
};

export const SpacePanelImpl = (props: SpacePanelImplProps) => {
  const {
    titleId,
    activeView,
    space,
    SpaceManager: SpaceManagerComponent = SpaceManager,
    InvitationManager: InvitationManagerComponent = InvitationManager,
    ...rest
  } = props;
  return (
    <DensityProvider density='fine'>
      <SpacePanelHeading {...rest} {...{ titleId, space }} />
      <Viewport.Root activeView={activeView}>
        <Viewport.Views>
          <Viewport.View id='space manager' classNames={stepStyles}>
            <SpaceManagerComponent active={activeView === 'space manager'} space={space} {...rest} />
          </Viewport.View>
          <Viewport.View id='space invitation manager' classNames={stepStyles}>
            <InvitationManagerComponent
              active={activeView === 'space invitation manager'}
              {...rest}
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
  const invitationStatus = useInvitationStatus(invitation);
  return (
    <SpacePanelImpl
      {...props}
      {...invitationStatus}
      invitationUrl={props.createInvitationUrl(invitationStatus.invitationCode!)}
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
