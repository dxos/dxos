//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Document } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { ObjectList } from '../../components';
import { createPath, useAppRouter } from '../../hooks';
import { FrameRuntime } from '../../registry';

export type FrameObjectListProps<T extends Document> = { frameDef: FrameRuntime<T> };

export const FrameObjectList = <T extends Document>({ frameDef }: FrameObjectListProps<T>) => {
  const navigate = useNavigate();
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
      onSelect={(objectId) => navigate(createPath({ spaceKey: space.key, frame: frame?.module.id, objectId }))}
      onCreate={handleCreate}
    />
  );
};
