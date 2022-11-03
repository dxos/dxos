//
// Copyright 2022 DXOS.org
//

import { Box, useFocusManager } from 'ink';
import React, { FC, ReactNode, useMemo } from 'react';

import { Party } from '@dxos/client';
import { useParty } from '@dxos/react-client';

import { useAppState } from '../../hooks';
import { Join, Share } from '../invitations';
import { MenuItem, Module, Panel } from '../util';
import { CreateParty } from './CreateParty';
import { PartyFeeds } from './PartyFeeds';
import { PartyInfo } from './PartyInfo';
import { PartyMembers } from './PartyMembers';
import { PartyView } from './PartyView';

const PartyPanel: FC<{
  children: ReactNode;
  party: Party;
}> = ({ children, party }) => {
  return (
    <Panel>
      <Box flexDirection='column' marginBottom={1}>
        <PartyInfo party={party} />
      </Box>

      {children}
    </Panel>
  );
};

export const createEchoMenu = (): MenuItem | undefined => {
  return {
    id: 'echo',
    label: 'ECHO',
    component: ({ parent }) => {
      const [{ spaceKey }] = useAppState();
      const party = useParty(spaceKey);
      const partyItems = useMemo(
        () =>
          party
            ? [
                {
                  id: 'members',
                  label: 'Members',
                  component: () => (
                    <PartyPanel party={party}>
                      <PartyMembers spaceKey={party.key} />
                    </PartyPanel>
                  )
                },
                {
                  id: 'feeds',
                  label: 'Feeds',
                  component: () => (
                    <PartyPanel party={party}>
                      <PartyFeeds spaceKey={party.key} />
                    </PartyPanel>
                  )
                },
                {
                  id: 'share',
                  label: 'Share Space',
                  component: () => (
                    <PartyPanel party={party}>
                      <Share
                        onCreate={() => {
                          return party.createInvitation();
                        }}
                      />
                    </PartyPanel>
                  )
                }
              ]
            : [],
        [party]
      );

      return (
        <Module
          id='echo'
          parent={parent}
          items={[
            {
              id: 'parties',
              label: 'Spaces',
              component: () => <PartyView />
            },
            ...partyItems,
            {
              id: 'join',
              label: 'Join Space',
              component: () => {
                const [, { setspaceKey }] = useAppState();
                const { focusPrevious } = useFocusManager();
                return (
                  <Join
                    onJoin={(spaceKey) => {
                      setspaceKey(spaceKey);
                      focusPrevious();
                    }}
                  />
                );
              }
            },
            {
              id: 'create',
              label: 'Create Space',
              component: () => {
                const [, { setspaceKey }] = useAppState();
                const { focusPrevious } = useFocusManager();
                return (
                  <CreateParty
                    onCreate={(spaceKey) => {
                      setspaceKey(spaceKey);
                      focusPrevious();
                    }}
                  />
                );
              }
            }
          ]}
        />
      );
    }
  };
};
