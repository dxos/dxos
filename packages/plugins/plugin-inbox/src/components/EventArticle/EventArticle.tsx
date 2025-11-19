//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { ElevationProvider } from '@dxos/react-ui';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { type Event } from '@dxos/types';

import { useEventToolbarActions } from './EventToolbar';

export const EventArticle = ({ subject: event }: SurfaceComponentProps<Event.Event>) => {
  const menu = useEventToolbarActions(event);

  return (
    <StackItem.Content classNames='relative' toolbar>
      <ElevationProvider elevation='positioned'>
        <MenuProvider {...menu} attendableId={Obj.getDXN(event).toString()}>
          <ToolbarMenu />
        </MenuProvider>
      </ElevationProvider>
    </StackItem.Content>
  );
};
