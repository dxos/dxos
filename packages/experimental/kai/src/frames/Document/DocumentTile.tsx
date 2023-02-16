//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { TextObject, useQuery } from '@dxos/react-client';

import { EditableObjectList } from '../../components';
import { createSpacePath, useFrameState } from '../../hooks';
import { Document } from '../../proto';

export const DocumentTile = () => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useFrameState();
  const objects = useQuery(space, Document.filter());
  if (!space || !frame) {
    return null;
  }

  const handleSelect = (objectId: string) => {
    navigate(createSpacePath(space.key, frame?.module.id, objectId));
  };

  const handleUpdate = async (objectId: string, text: string) => {
    const object = objects.find((object) => object.id === objectId);
    if (object) {
      object.title = text;
    }
  };

  const handleCreate = async () => {
    const object = await space.experimental.db.save(new Document());
    object.content = new TextObject(); // TODO(burdon): Make automatic?
    return object.id;
  };

  const Icon = frame!.runtime.Icon;

  return (
    <EditableObjectList<Document>
      objects={objects}
      selected={objectId}
      Icon={Icon}
      getTitle={(object) => object.title}
      onSelect={handleSelect}
      onUpdate={handleUpdate}
      onCreate={handleCreate}
    />
  );
};

export default DocumentTile;
