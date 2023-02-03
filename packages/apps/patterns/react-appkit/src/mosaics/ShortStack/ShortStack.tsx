//
// Copyright 2023 DXOS.org
//
import React from 'react';
import { useOutletContext } from 'react-router-dom';

import { Space } from '@dxos/client';
import { useQuery } from '@dxos/react-client';

import { Task, TaskList } from '../../proto';
import { AnyTile, TaskListTileProps, TaskTileProps } from '../../tiles';
import { MosaicProps } from '../MosaicProps';

export interface ShortStackContainerProps extends MosaicProps {
  type: 'shortStack';
}
export interface ShortStackProps extends MosaicProps {
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

export const isShortStackProps = (props: any): props is ShortStackProps => {
  return 'type' in props && props.type === 'shortStack';
};

export const renderContainerIfShortStack = (props: any) => {
  if (isShortStackProps(props)) {
    return <ShortStackContainer {...props} />;
  } else {
    return null;
  }
};

export const renderIfShortStack = (props: any) => {
  if (isShortStackProps(props)) {
    return <ShortStack {...props} />;
  } else {
    return null;
  }
};
