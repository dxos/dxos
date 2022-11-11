//
// Copyright 2022 DXOS.org
//

import { Box, useFocusManager } from 'ink';
import React, { FC, ReactNode, useMemo } from 'react';

import { Space } from '@dxos/client';
import { useSpace } from '@dxos/react-client';

import { useAppState } from '../../hooks';
import { Join, Share } from '../invitations';
import { MenuItem, Module, Panel } from '../util';
import { CreateSpace } from './CreateSpace';
import { SpaceFeeds } from './SpaceFeeds';
import { SpaceInfo } from './SpaceInfo';
import { SpaceMembers } from './SpaceMembers';
import { SpaceView } from './SpaceView';

const SpacePanel: FC<{
  children: ReactNode;
  space: Space;
}> = ({ children, space }) => {
  return (
    <Panel>
      <Box flexDirection='column' marginBottom={1}>
        <SpaceInfo space={space} />
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
      const space = useSpace(spaceKey);
      const spaceItems = useMemo(
        () =>
          space
            ? [
                {
                  id: 'members',
                  label: 'Members',
                  component: () => (
                    <SpacePanel space={space}>
                      <SpaceMembers spaceKey={space.key} />
                    </SpacePanel>
                  )
                },
                {
                  id: 'feeds',
                  label: 'Feeds',
                  component: () => (
                    <SpacePanel space={space}>
                      <SpaceFeeds spaceKey={space.key} />
                    </SpacePanel>
                  )
                },
                {
                  id: 'share',
                  label: 'Share Space',
                  component: () => (
                    <SpacePanel space={space}>
                      <Share
                        onCreate={() => {
                          return space.createInvitation();
                        }}
                      />
                    </SpacePanel>
                  )
                }
              ]
            : [],
        [space]
      );

      return (
        <Module
          id='echo'
          parent={parent}
          items={[
            {
              id: 'spaces',
              label: 'Spaces',
              component: () => <SpaceView />
            },
            ...spaceItems,
            {
              id: 'join',
              label: 'Join Space',
              component: () => {
                const [, { setSpaceKey }] = useAppState();
                const { focusPrevious } = useFocusManager();
                return (
                  <Join
                    onJoin={(spaceKey) => {
                      setSpaceKey(spaceKey);
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
                const [, { setSpaceKey }] = useAppState();
                const { focusPrevious } = useFocusManager();
                return (
                  <CreateSpace
                    onCreate={(spaceKey) => {
                      setSpaceKey(spaceKey);
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
