//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Filter, Obj } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Person } from '@dxos/types';

/**
 * The properties panel of the first Person in the space — where plugin-agent appends the
 * goals and memories its agents hold about them — so an interview can be watched filling it in.
 */
export const ProfileModule = () => {
  const space = Hooks.useActiveSpace();
  if (!space) {
    return null;
  }

  return <ProfileModuleContainer space={space} />;
};

const ProfileModuleContainer = ({ space }: { space: Space }) => {
  const [person] = useQuery(space.db, Filter.type(Person.Person));

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>{person ? Obj.getLabel(person) : 'Profile'}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {person && <Surface.Surface type={AppSurface.ObjectProperties} data={{ subject: person }} />}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
