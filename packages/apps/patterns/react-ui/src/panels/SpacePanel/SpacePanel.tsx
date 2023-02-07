//
// Copyright 2023 DXOS.org
//

import { CaretLeft, UserPlus } from 'phosphor-react';
import React, { cloneElement, useReducer } from 'react';

import { Space } from '@dxos/client';
import { useClient, useSpaceInvitations, useSpaces } from '@dxos/react-client';
import { Button, getSize, mx, Tooltip, useTranslation } from '@dxos/react-components';

import { InvitationList, PanelSeparator, SpaceListItem, SpaceMemberListContainer } from '../../components';
import { defaultSurface, subduedSurface } from '../../styles';

export type SpacePanelProps = {
  titleId?: string;
  space?: Space;
  createInvitationUrl: (invitationCode: string) => string;
  doneActionParent?: Parameters<typeof cloneElement>[0];
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
  const spaceTitle = space?.getProperty('title');

  if (!space) {
    return null;
  }

  return (
    <div role='none' className='flex flex-col'>
      <div role='none' className={mx(subduedSurface, 'rounded-bs-md flex items-center p-2 gap-2')}>
        <Tooltip content={t('show all spaces label')} zIndex='z-50'>
          <Button compact variant='ghost' onClick={onShowAll}>
            <CaretLeft className={getSize(4)} weight='bold' />
          </Button>
        </Tooltip>
        <h2 id={titleId} className={mx('grow', !spaceTitle && 'font-mono')}>
          {spaceTitle ?? space.key.truncate()}
        </h2>
      </div>
      <div role='region' className={mx(defaultSurface, 'rounded-be-md p-2')}>
        <InvitationList
          invitations={invitations}
          onClickRemove={({ invitation }) => invitation && space?.removeInvitation(invitation.invitationId!)}
          createInvitationUrl={createInvitationUrl}
        />
        <Button className='is-full flex gap-2' compact onClick={() => space?.createInvitation()}>
          <span>{t('create space invitation label')}</span>
          <UserPlus className={getSize(4)} weight='bold' />
        </Button>
        <PanelSeparator />
        <SpaceMemberListContainer spaceKey={space.key} includeSelf />
      </div>
    </div>
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
    activeView: props.space ? 'current space' : 'space list'
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
