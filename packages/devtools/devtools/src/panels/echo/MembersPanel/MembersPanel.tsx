//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { FormatEnum } from '@dxos/echo/internal';
import { SpaceMember, useMembers } from '@dxos/react-client/echo';
import { type Space } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';

export const MembersPanel = (props: { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const members = useMembers(space?.key);

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'identityKey', format: FormatEnum.DID },
      { name: 'displayName', format: FormatEnum.String },
      {
        name: 'status',
        format: FormatEnum.SingleSelect,
        config: {
          options: [
            { id: 'online', title: 'online', color: 'green' },
            { id: 'offline', title: 'offline', color: 'neutral' },
            { id: 'unknown', title: 'unknown', color: 'red' },
          ],
        },
      },
    ],
    [],
  );

  const data = useMemo(
    () =>
      members.map((member) => {
        let status = 'unknown';
        switch (member.presence) {
          case SpaceMember.PresenceState.ONLINE:
            status = 'online';
            break;
          case SpaceMember.PresenceState.OFFLINE:
            status = 'offline';
            break;
        }

        return {
          id: member.identity.identityKey.toString(),
          identityKey: member.identity.identityKey,
          displayName: member.identity.profile?.displayName,
          status,
          _original: member,
        };
      }),
    [members],
  );

  return (
    <PanelContainer
      toolbar={
        props.space ? undefined : (
          <Toolbar.Root>
            <DataSpaceSelector />
          </Toolbar.Root>
        )
      }
    >
      <MasterDetailTable
        properties={properties}
        data={data}
        detailsTransform={(item) => item._original}
        detailsPosition='bottom'
      />
    </PanelContainer>
  );
};
