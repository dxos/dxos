//
// Copyright 2023 DXOS.org
//
import React from 'react';
import { useOutletContext } from 'react-router-dom';

import { Space } from '@dxos/client';
import { useQuery } from '@dxos/react-client';

import { Task, TaskList } from '../../proto';
import { AnyTile, TaskListTileProps, TaskTileProps } from '../../tiles';
import { FrameProps } from '../FrameProps';

export interface ShortStackContainerProps extends FrameProps {
  type: 'shortStack';
}
export interface ShortStackProps extends FrameProps {
  type: 'shortStack';
  tiles: (TaskListTileProps | TaskTileProps)[];
}

export const ShortStackContainer = (props: ShortStackProps) => {
  const { space } = useOutletContext<{ space: Space }>();
  const tiles = useQuery(space, (item) => {
    return item instanceof Task || item instanceof TaskList;
  }).map((item) => ({ tile: item })) as (TaskListTileProps | TaskTileProps)[];
  return <ShortStack {...props} tiles={tiles} />;
};

export const ShortStack = ({ tiles }: ShortStackProps) => {
  return (
    <section role='list'>
      {tiles.map(({ tile }) => {
        return <AnyTile key={tile._id} tile={tile} slots={{ root: { role: 'listitem' } }} />;
      })}
    </section>
  );
};

export const isShortStackProps = (o: any): o is ShortStackProps => {
  return 'type' in o && o.type === 'shortStack';
};

export const renderContainerIfShortStack = (o: any) => {
  if (isShortStackProps(o)) {
    return <ShortStackContainer {...o} />;
  } else {
    return null;
  }
};

export const renderIfShortStack = (o: any) => {
  if (isShortStackProps(o)) {
    return <ShortStack {...o} />;
  } else {
    return null;
  }
};
