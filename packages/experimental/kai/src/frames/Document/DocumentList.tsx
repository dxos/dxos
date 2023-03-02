//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Document } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { EditableObjectList } from '../../components';
import { createPath, FrameDef, useAppRouter } from '../../hooks';
import { TextDocument } from '../../proto';

// TODO(burdon): Generalize across frames.
type DocListProps<T extends Document> = {
  frame: FrameDef;
  objects: T[];
  selected?: string;
  getTitle: (object: T) => string;
  setTitle: (object: T, title: string) => void;
  onSelect: (objectId: string) => void;
  onCreate: () => Promise<T>;
};

// TODO(burdon): Factor out.
const DocList = <T extends Document>({
  frame,
  objects,
  selected,
  getTitle,
  setTitle,
  onCreate,
  onSelect
}: DocListProps<T>) => {
  const handleCreate = async () => {
    const object = await onCreate();
    onSelect(object.id);
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
      onSelect={(objectId) => onSelect(objectId)}
      onUpdate={handleUpdate}
      onCreate={handleCreate}
    />
  );
};

export const DocumentList = () => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const objects = useQuery(space, TextDocument.filter());
  if (!space || !frame) {
    return null;
  }

  return (
    <DocList<TextDocument>
      frame={frame}
      objects={objects}
      selected={objectId}
      getTitle={(object) => object.title}
      setTitle={(object, title) => (object.title = title)}
      onSelect={(objectId) => navigate(createPath({ spaceKey: space.key, frame: frame?.module.id, objectId }))}
      onCreate={() => space.db.add(new TextDocument())}
    />
  );
};

export default DocumentList;
