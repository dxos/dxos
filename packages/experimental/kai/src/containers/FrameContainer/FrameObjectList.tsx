//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import React, { FC } from 'react';

import { Document } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { EditableObjectList } from '../../components';
import { useAppRouter } from '../../hooks';
import { FrameRuntime } from '../../registry';

export type FrameObjectListProps<T extends Document> = {
  frameDef: FrameRuntime<T>;
  Action?: FC<any>;
  onSelect?: (objectId: string) => void;
  onAction?: (objectId: string) => void;
};

export const FrameObjectList = <T extends Document>({
  frameDef, // TODO(burdon): Not required.
  Action,
  onSelect,
  onAction
}: FrameObjectListProps<T>) => {
  const { space, frame, objectId } = useAppRouter();
  const objects = useQuery(space, frameDef.filter?.());
  if (!space || !frame || !frameDef.filter) {
    return null;
  }

  const handleCreate = async () => {
    assert(frameDef.onCreate);
    const object = await frameDef.onCreate(space);
    onSelect?.(object.id);
    return object.id;
  };

  const handleUpdate = async (objectId: string, text: string) => {
    const object = objects.find((object) => object.id === objectId);
    if (object && frameDef.title) {
      (object as any)[frameDef.title] = text;
    }
  };

  const Icon = frame!.runtime.Icon;

  // TODO(burdon): Create hint if list is empty.
  return (
    <EditableObjectList<T>
      objects={objects}
      selected={objectId}
      Icon={Icon}
      getTitle={(object) => (frameDef.title ? object[frameDef.title] : undefined)}
      Action={Action}
      onSelect={onSelect}
      onAction={onAction}
      onCreate={frameDef.onCreate ? handleCreate : undefined}
      onUpdate={handleUpdate}
    />
  );
};
