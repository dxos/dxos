//
// Copyright 2023 DXOS.org
//

import { Check, UserPlus } from '@phosphor-icons/react';
import React, { cloneElement, useCallback } from 'react';

import { Button, ScrollArea, useTranslation } from '@dxos/aurora';
import { descriptionText, getSize, mx } from '@dxos/aurora-theme';
import { useSpaceInvitations } from '@dxos/react-client/echo';
import { CancellableInvitationObservable, Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { InvitationList, PanelAction, PanelActions, SpaceMemberList, SpaceMemberListProps } from '../../../components';
import { SpacePanelStepProps } from '../SpacePanelProps';

export type SpaceManagerProps = SpacePanelStepProps & {
  SpaceMemberList?: React.FC<SpaceMemberListProps>;
};

export type SpaceManagerImplProps = SpaceManagerProps & {
  invitations: CancellableInvitationObservable[];
};

export const SpaceManager = (props: SpaceManagerProps) => {
  const { space } = props;

  const invitations = useSpaceInvitations(space?.key);

  return <SpaceManagerImpl {...props} invitations={invitations} />;
};

export const SpaceManagerImpl = (props: SpaceManagerImplProps) => {
  const {
    active,
    space,
    createInvitationUrl,
    send,
    doneActionParent,
    onDone,
    invitations,
    SpaceMemberList: SpaceMemberListComponent = SpaceMemberList,
  } = props;
  const { t } = useTranslation('os');

  const doneButton = (
    <PanelAction
      aria-label={t('done label')}
      onClick={onDone}
      disabled={!active}
      classNames='order-1'
      data-testid='identity-panel-done'
    >
      <Check weight='light' className={getSize(6)} />
    </PanelAction>
  );

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);

  return (
    <>
      <ScrollArea.Root classNames='grow shrink basis-28 -mli-2'>
        <ScrollArea.Viewport classNames='is-full pli-2'>
          <h3 className={mx(descriptionText, 'text-center mlb-2')}>{t('space invitation list heading')}</h3>
          <InvitationList
            send={send}
            invitations={invitations}
            onClickRemove={(invitation) => invitation.cancel()}
            createInvitationUrl={createInvitationUrl}
          />
          <Button
            variant='outline'
            disabled={!active}
            classNames='is-full flex gap-2 plb-3 mbs-2'
            onClick={(e) => {
              const testing = e.altKey && e.shiftKey;
              const invitation = space.createInvitation?.(
                testing ? { type: Invitation.Type.MULTIUSE, authMethod: Invitation.AuthMethod.NONE } : undefined,
              );
              // TODO(wittjosiah): Don't depend on NODE_ENV.
              if (invitation && process.env.NODE_ENV !== 'production') {
                invitation.subscribe(onInvitationEvent);
              }
            }}
            data-testid='spaces-panel.create-invitation'
          >
            <span>{t('create space invitation label')}</span>
            <UserPlus className={getSize(4)} weight='bold' />
          </Button>
          <h3 className={mx(descriptionText, 'text-center mbs-4 mbe-2')}>{t('space member list heading')}</h3>
          <SpaceMemberListComponent spaceKey={space.key} includeSelf />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation='vertical'>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      <PanelActions>{doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}</PanelActions>
    </>
  );
};
