//
// Copyright 2023 DXOS.org
//

import assert from 'assert';
import React, { FC } from 'react';

import { Document } from '@dxos/echo-schema';

import { EditableObjectList } from '../../components';
import { FrameDef } from '../../registry';

export type ObjectListProps<T extends Document> = {
  frame: FrameDef<T>;
  objects: T[];
  selected?: string;
  getTitle: (object: T) => string;
  setTitle: (object: T, title: string) => void;
  Action?: FC<any>;
  onSelect?: (objectId: string) => void;
  onAction?: (objectId: string) => void;
  onCreate?: () => Promise<T>; // TODO(burdon): Tie to FrameDef.
};

export const ObjectList = <T extends Document>({
  frame,
  objects,
  selected,
  getTitle,
  setTitle,
  Action,
  onSelect,
  onAction,
  onCreate
}: ObjectListProps<T>) => {
  const handleCreate = async () => {
    assert(onCreate);
    const object = await onCreate();
    onSelect?.(object.id);
    return object.id;
  };

  const handleUpdate = async (objectId: string, text: string) => {
    const object = objects.find((object) => object.id === objectId);
    if (object) {
      setTitle(object, text);
    }
  };

  const Icon = frame!.runtime.Icon;

  return (
    <EditableObjectList<T>
      objects={objects}
      selected={selected}
      Icon={Icon}
      getTitle={getTitle}
      Action={Action}
      onSelect={(objectId) => onSelect?.(objectId)}
      onAction={onAction}
      onUpdate={handleUpdate}
      onCreate={onCreate && handleCreate}
    />
  );
};
