//
// Copyright 2023 DXOS.org
//

import React, { cloneElement, useState } from 'react';

import { Space } from '@dxos/client';
import { useClient, useSpaceInvitations, useSpaces } from '@dxos/react-client';
import { Button, useTranslation } from '@dxos/react-components';

import { InvitationList, PanelSeparator, SpaceListItem, SpaceMemberListContainer } from '../../components';

export type SpacePanelProps = {
  space?: Space;
  createInvitationUrl: (invitationCode: string) => string;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: (result: Space | null) => void;
};

export type SpaceView = 'current space' | 'space list';

export type SpaceState = {
  activeView: SpaceView;
};

const CurrentSpaceView = ({ space, createInvitationUrl, onShowAll }: { onShowAll: () => void } & SpacePanelProps) => {
  const { t } = useTranslation('os');
  const invitations = useSpaceInvitations(space?.key);

  if (!space) {
    return null;
  }

  return (
    <>
      <SpaceMemberListContainer spaceKey={space.key} includeSelf />
      <PanelSeparator />
      <InvitationList
        invitations={invitations}
        onClickRemove={({ invitation }) => invitation && space?.removeInvitation(invitation.invitationId!)}
        createInvitationUrl={createInvitationUrl}
      />
      <Button onClick={() => space?.createInvitation()}>{t('create space invitation')}</Button>
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

export const SpacePanel = (props: SpacePanelProps) => {
  const [state, setState] = useState<SpaceView>(props.space ? 'current space' : 'space list');

  // TODO(wittjosiah): Use ViewState or similar.
  return (
    <>
      {state === 'current space' ? (
        <CurrentSpaceView {...props} onShowAll={() => setState('space list')} />
      ) : (
        <SpaceListView {...props} />
      )}
    </>
  );
};
