//
// Copyright 2023 DXOS.org
//

import { UserPlus } from '@phosphor-icons/react';
import React, { cloneElement, useReducer } from 'react';

import { Space } from '@dxos/client';
import { useSpaceInvitations, observer } from '@dxos/react-client';
import { Button, DensityProvider, getSize, mx, useTranslation } from '@dxos/react-components';

import { InvitationList, PanelSeparator, SpaceMemberListContainer } from '../../components';
import { defaultSurface, subduedSurface } from '../../styles';

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

  if (!space) {
    return null;
  }

  return (
    <div role='none' className='flex flex-col'>
      <div role='none' className={mx(subduedSurface, 'rounded-bs-md flex items-center p-2 gap-2')}>
        {/* TODO(wittjosiah): Label this as the space panel. */}
        <h2 id={titleId} className={mx('grow font-system-medium', !name && 'font-mono')}>
          {name ?? space.key.truncate()}
        </h2>
      </div>
      <div role='region' className={mx(defaultSurface, 'rounded-be-md p-2')}>
        <InvitationList
          invitations={invitations}
          onClickRemove={({ invitation }) => invitation && space?.removeInvitation(invitation.invitationId!)}
          createInvitationUrl={createInvitationUrl}
        />
        <Button
          className='is-full flex gap-2 mbs-2'
          onClick={() => space?.createInvitation()}
          data-testid='spaces-panel.create-invitation'
        >
          <span>{t('create space invitation label')}</span>
          <UserPlus className={getSize(4)} weight='bold' />
        </Button>
        <PanelSeparator />
        <SpaceMemberListContainer spaceKey={space.key} includeSelf />
      </div>
    </div>
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
  return (
    <DensityProvider density='fine'>
      {panelState.activeView === 'current space' ? <CurrentSpaceView {...props} /> : null}
    </DensityProvider>
  );
};
