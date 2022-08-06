//
// Copyright 2022 DXOS.org
//

import { useFocusManager } from 'ink';
import React, { useMemo } from 'react';

import { useParty } from '@dxos/react-client';

import { useAppState } from '../../hooks';
import { Join, Share } from '../invitations';
import { MenuItem, Module, Panel } from '../util';
import { CreateParty } from './CreateParty';
import { PartyFeeds } from './PartyFeeds';
import { PartyMembers } from './PartyMembers';
import { PartyView } from './PartyView';

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
            <Panel>
              <PartyMembers
                partyKey={party.key}
              />
            </Panel>
          )
        },
        {
          id: 'feeds',
          label: 'Feeds',
          component: () => (
            <Panel>
              <PartyFeeds
                partyKey={party.key}
              />
            </Panel>
          )
        },
        {
          id: 'share',
          label: 'Share Party',
          component: () => (
            <Panel>
              <Share
                onCreate={() => {
                  return party.createInvitation();
                }}
              />
            </Panel>
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
              label: 'Parties',
              component: () => (
                <PartyView />
              )
            },
            ...partyItems,
            {
              id: 'join',
              label: 'Join Party',
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
              label: 'Create Party',
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
