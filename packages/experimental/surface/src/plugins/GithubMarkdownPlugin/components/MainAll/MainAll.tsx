//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';

import { Document } from '@braneframe/types';
import { Button, List, ListItem, Main } from '@dxos/aurora';
import { useQuery, observer, Space } from '@dxos/react-client';

export const MainAll = observer(({ data }: { data?: any; role?: string }) => {
  const navigate = useNavigate();
  const space = data as Space;
  const spaceSlug = space?.key?.toHex() ?? 'never';

  const documents = useQuery(space, Document.filter());
  const handleCreate = useCallback(async () => {
    if (space) {
      const document = await space?.db.add(new Document());
      return navigate(`/document/${spaceSlug}/${document.id}`);
    }
  }, [space, navigate]);
  return (
    <Main.Content>
      <Button onClick={handleCreate}>Create document</Button>
      <List>
        {documents.map((document) => {
          return (
            <ListItem.Root key={document.id}>
              <Link to={`/document/${spaceSlug}/${document.id}`}>
                <ListItem.Heading>{document.title ?? 'Untitled'}</ListItem.Heading>
              </Link>
            </ListItem.Root>
          );
        })}
      </List>
    </Main.Content>
  );
});
