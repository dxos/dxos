//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuery } from '@dxos/react-client';

import { ObjectList } from '../../components';
import { createPath, useAppRouter } from '../../hooks';
import { Document } from '../../proto';

export const DocumentList = () => {
  const navigate = useNavigate();
  const { space, frame, objectId } = useAppRouter();
  const objects = useQuery(space, Document.filter());
  if (!space || !frame) {
    return null;
  }

  return (
    <ObjectList<Document>
      frame={frame}
      objects={objects}
      selected={objectId}
      getTitle={(object) => object.title}
      setTitle={(object, title) => (object.title = title)}
      onSelect={(objectId) => navigate(createPath({ spaceKey: space.key, frame: frame?.module.id, objectId }))}
      onCreate={() => space.db.add(new Document())}
    />
  );
};

export default DocumentList;
