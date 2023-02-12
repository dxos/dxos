//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { id } from '@dxos/client';
import { PublicKey, TextObject, useQuery } from '@dxos/react-client';

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

  const handleCreate = async () => {
    const title = `doc-${PublicKey.random().toHex().slice(0, 4)}`;
    const object = await space.experimental.db.save(new Document({ title }));
    object.content = new TextObject(); // TODO(burdon): Make automatic?
    return object[id];
  };

  const Icon = frame!.runtime.Icon;

  return (
    <EditableObjectList<Document>
      objects={objects}
      selected={objectId}
      Icon={Icon}
      getTitle={(object) => object.title}
      onSelect={handleSelect}
      onCreate={handleCreate}
    />
  );
};

export default DocumentTile;
