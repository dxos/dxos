//
// Copyright 2023 DXOS.org
//

import React, { cloneElement, useReducer } from 'react';

import { Space } from '@dxos/client';
import { useClient, useSpaceInvitations, useSpaces } from '@dxos/react-client';
import { Button, useTranslation } from '@dxos/react-components';

import { InvitationList, PanelSeparator, SpaceListItem, SpaceMemberListContainer } from '../../components';

export type SpacePanelProps = {
  titleId?: string;
  space?: Space;
  createInvitationUrl: (invitationCode: string) => string;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  exitActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: (result: Space | null) => void;
};

export type SpaceView = 'current space' | 'space list';

export type SpaceState = {
  activeView: SpaceView;
};

const CurrentSpaceView = ({
  space,
  createInvitationUrl,
  onShowAll,
  titleId
}: { onShowAll: () => void } & SpacePanelProps) => {
  const { t } = useTranslation('os');
  const invitations = useSpaceInvitations(space?.key);

  if (!space) {
    return null;
  }

  return (
    <>
      <InvitationList
        invitations={invitations}
        onClickRemove={({ invitation }) => invitation && space?.removeInvitation(invitation.invitationId!)}
        createInvitationUrl={createInvitationUrl}
      />
      <Button onClick={() => space?.createInvitation()}>{t('create space invitation label')}</Button>
      <PanelSeparator />
      <SpaceMemberListContainer spaceKey={space.key} includeSelf />
      <Button onClick={() => onShowAll()}>{t('show all spaces')}</Button>
    </>
  );
};

const SpaceListView = ({ doneActionParent, onDone }: SpacePanelProps) => {
  const { t } = useTranslation('os');
  const client = useClient();
  const spaces = useSpaces();

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    onDone?.(space);
  };

  return (
    <>
      <Button onClick={handleCreateSpace}>{t('create space')}</Button>
      <ul>
        {spaces.map((space) => {
          const key = space.key.toHex();
          const listItem = <SpaceListItem key={key} space={space} onSelect={() => onDone?.(space)} />;
          return doneActionParent ? cloneElement(doneActionParent, { key }, listItem) : listItem;
        })}
      </ul>
    </>
  );
};

interface SpacePanelState {
  activeView: SpaceView;
}

interface SpacePanelAction {
  type: 'deselect space' | 'select space';
}

export const SpacePanel = (props: SpacePanelProps) => {
  const reducer = (state: SpacePanelState, action: SpacePanelAction) => {
    const nextState = { ...state };
    switch (action.type) {
      case 'deselect space':
        nextState.activeView = 'space list';
        break;
      case 'select space':
        nextState.activeView = 'current space';
        break;
    }
    return nextState;
  };

  const [panelState, dispatch] = useReducer(reducer, {
    activeView: 'current space'
  });

  // TODO(wittjosiah): Use ViewState or similar.
  return (
    <>
      {panelState.activeView === 'current space' ? (
        <CurrentSpaceView {...props} onShowAll={() => dispatch({ type: 'deselect space' })} />
      ) : (
        <SpaceListView {...props} />
      )}
    </>
  );
};
