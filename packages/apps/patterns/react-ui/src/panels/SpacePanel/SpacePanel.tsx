//
// Copyright 2023 DXOS.org
//

import React, { cloneElement, useCallback, useReducer } from 'react';

import { Invitation, InvitationEncoder, Space } from '@dxos/client';
import { useSpaceInvitations, observer } from '@dxos/react-client';
import { useTranslation, Avatar } from '@dxos/react-components';

import { InvitationList, SpaceMemberListContainer } from '../../components';
import { HaloRing } from '../../components/HaloRing';
import { Title, Heading, Content, Button, Panel, CloseButton } from '../Panel';
import { humanize } from '@dxos/util';

export type SpacePanelProps = {
  titleId?: string;
  space: Space;
  createInvitationUrl: (invitationCode: string) => string;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
};

export type SpaceView = 'current space';

const CurrentSpaceView = observer(({ space, createInvitationUrl, titleId }: SpacePanelProps) => {
  const { t } = useTranslation('os');
  const invitations = useSpaceInvitations(space?.key);
  const name = space?.properties.name;

  console.log('[space panel]', process.env.NODE_ENV);

  if (!space) {
    return null;
  }

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    console.log(JSON.stringify({ invitationCode }));
    if (invitation.authCode) {
      console.log(JSON.stringify({ authCode: invitation.authCode }));
    }
  }, []);

  return (
    <Panel>
      <Title>Space members</Title>
      <CloseButton />
      <Content className='text-center flex items-center justify-center content-center'>
        <HaloRing>
          <Avatar labelId={''} fallbackValue={space.key.toString()} />
        </HaloRing>
      </Content>
      <Heading>{name ?? humanize(space?.key)}</Heading>
      <Content>
        <InvitationList
          invitations={invitations}
          onClickRemove={(invitation) => invitation.get() && space?.removeInvitation(invitation.get().invitationId)}
          createInvitationUrl={createInvitationUrl}
        />
      </Content>
      <Content>
        <Button
          onClick={() => {
            const invitation = space?.createInvitation();
            if (process.env.NODE_ENV !== 'production') {
              invitation.subscribe(onInvitationEvent);
            }
          }}
          data-testid='spaces-panel.create-invitation'
        >
          <span>{t('create space invitation label')}</span>
        </Button>
      </Content>
      <Content>
        <SpaceMemberListContainer spaceKey={space.key} includeSelf />
      </Content>
    </Panel>
  );
});

interface SpacePanelState {
  activeView: SpaceView;
}

interface SpacePanelAction {
  type: null;
}

export const SpacePanel = (props: SpacePanelProps) => {
  const reducer = (state: SpacePanelState, action: SpacePanelAction) => {
    const nextState = { ...state };
    switch (action.type) {
      case null:
    }
    return nextState;
  };

  const [panelState] = useReducer(reducer, {
    activeView: 'current space'
  });

  // TODO(wittjosiah): Use ViewState or similar.
  return panelState.activeView === 'current space' ? <CurrentSpaceView {...props} /> : null;
};
