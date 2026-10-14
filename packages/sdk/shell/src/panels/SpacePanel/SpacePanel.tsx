//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { log } from '@dxos/log';
import { type CancellableInvitationObservable, useInvitationStatus } from '@dxos/react-client/invitations';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';

import { Viewport } from '../../components/index.ts';
import { InvitationManager } from '../../steps/index.ts';
import { translationKey } from '../../translations.ts';
import { useSpaceMachine } from './space-machine.ts';
import { SpaceManager } from './SpaceManager.tsx';
import { type SpacePanelHeadingProps, type SpacePanelImplProps, type SpacePanelProps } from './SpacePanelProps.ts';

type SpacePanelActiveView = SpacePanelImplProps['activeView'];

const SpacePanelHeading = ({ titleId, onDone }: SpacePanelHeadingProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <Dialog.Header>
      <Dialog.Title id={titleId}>{t('space-panel.heading')}</Dialog.Title>
      <Button.Root
        variant='ghost'
        icon='ph--x--regular'
        iconOnly
        label={t('exit.label')}
        onClick={() => onDone?.()}
        data-testid='identity-panel-done'
      />
    </Dialog.Header>
  );
};

/** The space's name, at the top of the space manager's body. */
const SpaceName = ({ space }: Pick<SpacePanelImplProps, 'space'>) => (
  <Layout.Flex gap='sm' align='center'>
    <Icon.Icon icon='ph--planet--light' size='xl' />
    <Typography.Text truncate>{space.properties.name ?? space.key.truncate()}</Typography.Text>
  </Layout.Flex>
);

export const SpacePanelImpl = (props: SpacePanelImplProps) => {
  const {
    titleId,
    activeView,
    space,
    hideHeading,
    target,
    SpaceManager: SpaceManagerComponent = SpaceManager,
    InvitationManager: InvitationManagerComponent = InvitationManager,
    ...rest
  } = props;

  return (
    <>
      {!hideHeading && <SpacePanelHeading {...rest} titleId={titleId} />}
      <Viewport.Root activeView={activeView}>
        <Viewport.Views>
          <Viewport.View id='space-manager'>
            <SpaceManagerComponent
              active={activeView === 'space-manager'}
              space={space}
              target={target}
              heading={hideHeading ? undefined : <SpaceName space={space} />}
              {...rest}
            />
          </Viewport.View>
          <Viewport.View id='space-invitation-manager'>
            <InvitationManagerComponent
              active={activeView === 'space-invitation-manager'}
              {...rest}
              invitationUrl={props.invitationUrl}
            />
          </Viewport.View>
        </Viewport.Views>
      </Viewport.Root>
    </>
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
  const titleId = Hooks.useId('spacePanel__heading', propsTitleId);

  const [spaceState, spaceSend, spaceService] = useSpaceMachine({ context: { space: props.space } });

  useEffect(() => {
    const subscription = spaceService.subscribe((state) => {
      log('[state]', state);
    });

    return subscription.unsubscribe;
  }, [spaceService]);

  const activeView = useMemo((): SpacePanelActiveView => {
    switch (true) {
      case spaceState.matches('managingSpace'):
        return 'space-manager';
      case spaceState.matches('managingSpaceInvitation'):
        return 'space-invitation-manager';
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
