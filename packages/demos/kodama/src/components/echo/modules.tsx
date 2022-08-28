//
// Copyright 2022 DXOS.org
//

import { Box, useFocusManager } from 'ink';
import React, { FC, ReactNode, useMemo } from 'react';

import { Party } from '@dxos/client';
import { useParty } from '@dxos/react-client';

import { useAppState } from '../../hooks';
import { Join, Invite } from '../invitations';
import { MenuItem, Module, Panel } from '../util';
import { CreateParty } from './CreateParty';
import { PartyFeeds } from './PartyFeeds';
import { PartyInfo } from './PartyInfo';
import { PartyMembers } from './PartyMembers';
import { PartyView } from './PartyView';

const PartyPanel: FC<{
  children: ReactNode
  party: Party
}> = ({
  children,
  party
}) => {
  return (
    <Panel>
      <Box flexDirection='column' marginBottom={1}>
        <PartyInfo
          party={party}
        />
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
      const [{ partyKey }] = useAppState();
      const party = useParty(partyKey);
      const partyItems = useMemo(() => party ? [
        {
          id: 'members',
          label: 'Members',
          component: () => (
            <PartyPanel party={party}>
              <PartyMembers
                partyKey={party.key}
              />
            </PartyPanel>
          )
        },
        {
          id: 'feeds',
          label: 'Feeds',
          component: () => (
            <PartyPanel party={party}>
              <PartyFeeds
                partyKey={party.key}
              />
            </PartyPanel>
          )
        },
        {
          id: 'share',
          label: 'Share Space',
          component: () => (
            <PartyPanel party={party}>
              <Invite
                onCreate={() => {
                  return party.createInvitation();
                }}
              />
            </PartyPanel>
          )
        }
      ] : [], [party]);

      return (
        <Module
          id='echo'
          parent={parent}
          items={[
            {
              id: 'parties',
              label: 'Spaces',
              component: () => (
                <PartyView />
              )
            },
            ...partyItems,
            {
              id: 'join',
              label: 'Join Space',
              component: () => {
                const [, { setPartyKey }] = useAppState();
                const { focusPrevious } = useFocusManager();
                return (
                  <Join
                    onJoin={partyKey => {
                      setPartyKey(partyKey);
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
                const [, { setPartyKey }] = useAppState();
                const { focusPrevious } = useFocusManager();
                return (
                  <CreateParty
                    onCreate={partyKey => {
                      setPartyKey(partyKey);
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
