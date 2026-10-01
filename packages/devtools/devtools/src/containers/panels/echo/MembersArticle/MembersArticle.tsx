//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { Format } from '@dxos/echo/Format';
import { toPublicKey } from '@dxos/protocols/buf';
import { SpaceMember_PresenceState, useMembers } from '@dxos/react-client/echo';
import { type Space } from '@dxos/react-client/echo';
import { Next } from '@dxos/react-ui';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable } from '../../../../components/index.ts';
import { DataSpaceSelector } from '../../../../containers/index.ts';
import { useDevtoolsState } from '../../../../hooks/index.ts';
import { type ArticleProps } from '../../types.ts';

export const MembersArticle = ({ role, ...props }: ArticleProps & { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const members = useMembers(space?.key);

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'identityKey', format: Format.TypeFormat.DID },
      { name: 'displayName', format: Format.TypeFormat.String },
      {
        name: 'status',
        format: Format.TypeFormat.SingleSelect,
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

  const data = useMemo(() => {
    return members.map((member) => {
      let status = 'unknown';
      switch (member.presence) {
        case SpaceMember_PresenceState.ONLINE:
          status = 'online';
          break;
        case SpaceMember_PresenceState.OFFLINE:
          status = 'offline';
          break;
      }

      const identityKey = toPublicKey(member.identity?.identityKey);
      return {
        id: identityKey?.toString() ?? '',
        identityKey,
        displayName: member.identity?.profile?.displayName,
        status,
        _original: member,
      };
    });
  }, [members]);

  return (
    <Next.Panel.Root role={role}>
      {!props.space && (
        <Next.Panel.Header>
          <Next.Toolbar.Root>
            <DataSpaceSelector />
          </Next.Toolbar.Root>
        </Next.Panel.Header>
      )}
      <Next.Panel.Body>
        <MasterDetailTable
          properties={properties}
          data={data}
          detailsTransform={(item) => item._original}
          detailsPosition='bottom'
        />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
