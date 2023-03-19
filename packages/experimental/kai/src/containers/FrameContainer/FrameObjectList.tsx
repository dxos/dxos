//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import React, { FC } from 'react';

import { Document } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { ObjectList } from '../../components';
import { useAppRouter } from '../../hooks';
import { FrameRuntime } from '../../registry';

export type FrameObjectListProps<T extends Document> = {
  frameDef: FrameRuntime<T>;
  Action?: FC<any>;
  onSelect?: (objectId: string) => void;
  onAction?: (objectId: string) => void;
};

export const FrameObjectList = <T extends Document>({
  frameDef,
  Action,
  onSelect,
  onAction
}: FrameObjectListProps<T>) => {
  const { space, frame, objectId } = useAppRouter();
  const objects = useQuery(space, frameDef.filter?.());
  if (!space || !frame || !frameDef.filter) {
    return null;
  }

  let handleCreate;
  if (frameDef.onCreate) {
    handleCreate = async () => {
      assert(frameDef.onCreate);
      return await frameDef.onCreate(space);
    };
  }

  return (
    <ObjectList<T>
      frame={frame}
      objects={objects}
      selected={objectId}
      getTitle={(object) => (frameDef.title ? object[frameDef.title] : undefined)}
      setTitle={(object, title) => frameDef.title && ((object as any)[frameDef.title] = title)}
      Action={Action}
      onSelect={onSelect}
      onAction={onAction}
      onCreate={handleCreate}
    />
  );
};
