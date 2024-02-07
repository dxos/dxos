//
// Copyright 2023 DXOS.org
//

import { Planet } from '@phosphor-icons/react';
import React, { useEffect, useMemo } from 'react';

import { log } from '@dxos/log';
import { useInvitationStatus } from '@dxos/react-client/invitations';
import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';
import { DensityProvider, useId, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type SpacePanelHeadingProps, type SpacePanelImplProps, type SpacePanelProps } from './SpacePanelProps';
import { useSpaceMachine } from './spaceMachine';
import { SpaceManager } from './steps';
import { Heading, CloseButton, Viewport } from '../../components';
import { InvitationManager } from '../../steps';
import { stepStyles } from '../../styles';

const SpacePanelHeading = ({ titleId, space, onDone, variant }: SpacePanelHeadingProps) => {
  const { t } = useTranslation('os');
  const name = space.properties.name;
  return (
    <Heading
      titleId={titleId}
      title={t('space panel heading')}
      corner={<CloseButton data-testid='identity-panel-done' onDone={onDone} />}
      variant={variant}
    >
      <div
        role='none'
        className={mx('flex items-center mlb-4', variant === 'main' ? 'gap-2 pli-4' : 'gap-4 justify-center')}
      >
        <Planet size={32} weight='light' />
        <h2 className='font-light text-xl'>{name ?? space.key.truncate()}</h2>
      </div>
    </Heading>
  );
};

export const SpacePanelImpl = (props: SpacePanelImplProps) => {
  const {
    titleId,
    activeView,
    space,
    target,
    SpaceManager: SpaceManagerComponent = SpaceManager,
    InvitationManager: InvitationManagerComponent = InvitationManager,
    ...rest
  } = props;

  return (
    <DensityProvider density='fine'>
      <SpacePanelHeading {...rest} {...{ titleId, space }} />
      <Viewport.Root activeView={activeView}>
        <Viewport.Views {...(props.variant === 'main' && { classNames: 'bs-full' })}>
          <Viewport.View id='space manager' classNames={stepStyles}>
            <SpaceManagerComponent active={activeView === 'space manager'} space={space} target={target} {...rest} />
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
    // TODO(wittjosiah): Unused? Remove?
    <SpacePanelWithInvitationImpl {...implProps} invitation={spaceState.context.invitation} />
  ) : (
    <SpacePanelImpl {...implProps} />
  );
};
