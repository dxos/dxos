//
// Copyright 2023 DXOS.org
//

import { Kanban as KanbanIcon, PlusCircle } from 'phosphor-react';
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { id, PublicKey, useQuery, useSpace } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button, Input, List, ListItemButton } from '../../components';
import { createSpacePath } from '../../hooks';
import { Kanban } from '../../proto';

// TODO(burdon): Reuse basic item creation.
export const KanbanTile = () => {
  // TODO(burdon): Doesn't update if space changes (get from param not context). Pass in space?
  const { frame, spaceKey, objectId } = useParams();
  const space = useSpace();
  const objects = useQuery(space, Kanban.filter());
  const navigate = useNavigate();

  console.log('>>>>>>>>>>>>>>>>', spaceKey, space?.key.truncate());

  // TODO(burdon): Option to auto-create.
  useEffect(() => {
    if (objects.length === 0) {
      void handleCreate();
    } else {
      if (!objectId) {
        handleSelect(objects[0][id]);
      }
    }
  }, [objects]);

  if (!space) {
    return null;
  }

  const handleSelect = (objectId: string) => {
    navigate(createSpacePath(space.key, frame, objectId));
  };

  const handleCreate = async () => {
    const title = `Kanban ${PublicKey.random().toHex().slice(0, 4)}`;
    const object = await space.experimental.db.save(new Kanban({ title }));
    handleSelect(object[id]);
  };

  // TODO(burdon): Reuse list.
  // TODO(burdon): Generic frame tile list.
  // TODO(burdon): Update title.
  // TODO(burdon): Delete.
  // TODO(burdon): Focus on create.
  return (
    <div className='flex flex-col'>
      <List>
        {objects.map((object) => (
          <ListItemButton key={object[id]}>
            <div
              className={mx('pl-1 pr-2 cursor-pointer', object[id] === objectId && 'text-blue-500')}
              onClick={() => handleSelect(object[id])}
            >
              <KanbanIcon className={getSize(6)} />
            </div>
            <Input className='w-full p-1' value={object.title} placeholder='Title' />
          </ListItemButton>
        ))}
      </List>

      <div className='flex flex-row-reverse px-4 py-2'>
        <Button onClick={handleCreate}>
          <PlusCircle className={getSize(6)} />
        </Button>
        <div>{space.key.truncate()}</div>
      </div>
    </div>
  );
};

export default KanbanTile;
