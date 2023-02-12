//
// Copyright 2023 DXOS.org
//

import { Kanban as KanbanIcon, PlusCircle } from 'phosphor-react';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { id, PublicKey, useQuery, useSpace } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Button, Input, List, ListItemButton } from '../../components';
import { createSpacePath } from '../../hooks';
import { Kanban } from '../../proto';

export const KanbanTile = () => {
  const space = useSpace();
  // TODO(burdon): Doesn't update if space changes.
  const objects = useQuery(space, Kanban.filter());
  const navigate = useNavigate();

  // TODO(burdon): Selection.
  // TODO(burdon): Option to auto-create.
  useEffect(() => {
    if (objects.length === 0) {
      void handleCreate();
    }
  }, [objects]);

  if (!space) {
    return null;
  }

  const handleSelect = (objectId: string) => {
    navigate(createSpacePath(space.key, 'dxos.module.frame.kanban', objectId));
  };

  const handleCreate = async () => {
    const title = `Kanban ${PublicKey.random().toHex().slice(0, 4)}`;
    const object = await space.experimental.db.save(new Kanban({ title }));
    handleSelect(object[id]);
  };

  // TODO(burdon): Reuse list.
  // TODO(burdon): Generic frame tile list.
  return (
    <div className='flex flex-col'>
      <List>
        {objects.map((object) => (
          <ListItemButton key={object[id]}>
            <div className='pl-1 pr-2 cursor-pointer' onClick={() => handleSelect(object[id])}>
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
      </div>
    </div>
  );
};

export default KanbanTile;
