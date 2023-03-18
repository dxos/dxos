//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import React from 'react';

import { Document } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { ObjectList } from '../../components';
import { useAppRouter } from '../../hooks';
import { FrameRuntime } from '../../registry';

export type FrameObjectListProps<T extends Document> = {
  frameDef: FrameRuntime<T>;
  onSelect: (objectId: string) => void;
};

export const FrameObjectList = <T extends Document>({ frameDef, onSelect }: FrameObjectListProps<T>) => {
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
      onSelect={onSelect}
      onCreate={handleCreate}
    />
  );
};
