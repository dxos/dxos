//
// Copyright 2022 DXOS.org
//

import { Box, useFocusManager } from 'ink';
import React, { FC, ReactNode, useMemo } from 'react';

import { Party } from '@dxos/client';
import { useParty } from '@dxos/react-client';

import { useAppState } from '../../hooks/index.js';
import { Join, Share } from '../invitations/index.js';
import { MenuItem, Module, Panel } from '../util/index.js';
import { CreateParty } from './CreateParty.js';
import { PartyFeeds } from './PartyFeeds.js';
import { PartyInfo } from './PartyInfo.js';
import { PartyMembers } from './PartyMembers.js';
import { PartyView } from './PartyView.js';

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
              <Share
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
