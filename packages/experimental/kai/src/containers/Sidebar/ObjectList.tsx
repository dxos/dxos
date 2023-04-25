//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import React from 'react';

import { TypedObject } from '@dxos/echo-schema';
import { FrameRuntime } from '@dxos/kai-frames';
import { EditableObjectList } from '@dxos/mosaic';
import { ShowDeletedOption, useQuery } from '@dxos/react-client';

import { useAppRouter } from '../../hooks';

// TODO(burdon): Generalize?
export enum ObjectAction {
  SELECT = 1,
  DELETE = 2,
  RESTORE = 3
}

export type ObjectListProps<T extends TypedObject> = {
  frameDef: FrameRuntime<T>;
  showDeleted?: boolean;
  onAction?: (object: T, action: ObjectAction) => void;
};

export const ObjectList = <T extends TypedObject>({ frameDef, showDeleted, onAction }: ObjectListProps<T>) => {
  const { space, frame, objectId } = useAppRouter();
  const objects = useQuery(
    space,
    frameDef.filter?.(),
    showDeleted ? { deleted: ShowDeletedOption.SHOW_DELETED } : undefined
  );
  if (!space || !frame || !frameDef.filter) {
    return null;
  }

  const handleCreate = async () => {
    assert(frameDef.onCreate);
    const object = await frameDef.onCreate(space);
    onAction?.(object, ObjectAction.SELECT);
    return object.id;
  };

  const handleUpdate = async (objectId: string, text: string) => {
    const object = objects.find((object) => object.id === objectId);
    if (object && frameDef.title) {
      (object as any)[frameDef.title] = text;
    }
  };

  const handleSelect = (objectId: string) => {
    const object = objects.find((object) => object.id === objectId);
    onAction?.(object!, ObjectAction.SELECT);
  };

  const Icon = frame!.runtime.Icon;

  const Action = () => null;

  // TODO(burdon): Create hint if list is empty.
  return (
    <EditableObjectList<T>
      objects={objects}
      selected={objectId}
      Icon={Icon}
      Action={Action}
      getTitle={(object) => (frameDef.title ? object[frameDef.title] : undefined)}
      onSelect={handleSelect}
      onCreate={frameDef.onCreate ? handleCreate : undefined}
      onUpdate={handleUpdate}
    />
  );
};
