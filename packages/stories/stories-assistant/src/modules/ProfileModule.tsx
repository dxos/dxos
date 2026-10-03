//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Person } from '@dxos/types';

/**
 * The properties panel of the first Person in the space — where plugin-agent appends the
 * goals and memories its agents hold about them — so an interview can be watched filling it in.
 */
export const ProfileModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <ProfileModuleContainer space={space} />;
};

const ProfileModuleContainer = ({ space }: { space: Space }) => {
  const [person] = useQuery(space.db, Filter.type(Person.Person));

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{person ? Obj.getLabel(person) : 'Profile'}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {person && <Surface.Surface type={AppSurface.ObjectProperties} data={{ subject: person }} />}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
