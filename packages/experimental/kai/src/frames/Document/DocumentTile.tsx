//
// Copyright 2023 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { id, PublicKey, TextObject, useQuery } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button, Input, List, ListItemButton } from '../../components';
import { createSpacePath, useFrameState } from '../../hooks';
import { Document } from '../../proto';

// TODO(burdon): Reuse basic tile for object management.
export const DocumentTile = () => {
  const { space, frame, objectId } = useFrameState();
  const objects = useQuery(space, Document.filter());
  const navigate = useNavigate();

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

    handleSelect(object[id]);
  };

  const Icon = frame!.runtime.Icon;

  // TODO(burdon): Reuse list.
  // TODO(burdon): Generic frame tile list.
  // TODO(burdon): Update title.
  // TODO(burdon): Focus on create.
  // TODO(burdon): Delete.
  return (
    <div className='flex flex-col'>
      <List>
        {objects.map((object) => (
          <ListItemButton key={object[id]}>
            <div
              className={mx('pl-1 pr-2 cursor-pointer', object[id] === objectId && 'text-selection-text')}
              onClick={() => handleSelect(object[id])}
            >
              <Icon className={getSize(6)} />
            </div>
            <Input className='w-full p-1' value={object.title} placeholder='Title' />
          </ListItemButton>
        ))}
      </List>

      <div className='flex px-3 py-2'>
        <Button onClick={handleCreate}>
          <PlusCircle className={getSize(6)} />
        </Button>
      </div>
    </div>
  );
};

export default DocumentTile;
