//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { Callout, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Card, CardStack, StackItem } from '@dxos/react-ui-stack';
import { type View, getTypenameFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

import { ObjectForm } from './ObjectForm';

export type ObjectDetailsPanelProps = {
  objectId: string;
  view: View.View;
};

// TODO(burdon): Rename ObjectDetailsAritcle; use SurfaceComponentProps?
export const ObjectDetailsPanel = ({ objectId, view }: ObjectDetailsPanelProps) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(view);
  const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(space, typename);

  const queriedObjects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const selectedRows = useSelected(objectId, 'multi');
  const selectedObjects = selectedRows.map((id) => queriedObjects.find((obj) => obj.id === id)).filter(isNonNullable);

  if (!schema) {
    return null;
  }

  if (!schema) {
    return null;
  }

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root></Toolbar.Root>
      <CardStack.Root asChild>
        <CardStack.Content>
          <CardStack.Stack id={objectId} itemsCount={selectedObjects.length}>
            {selectedObjects.length === 0 && (
              <Callout.Root>
                <Callout.Title>{t('row details no selection label')}</Callout.Title>
              </Callout.Root>
            )}
            {selectedObjects.map((object) => (
              <CardStack.Item key={object.id} asChild>
                <StackItem.Root item={object}>
                  <Card.StaticRoot>
                    <ObjectForm object={object} schema={schema} />
                  </Card.StaticRoot>
                </StackItem.Root>
              </CardStack.Item>
            ))}
          </CardStack.Stack>
        </CardStack.Content>
      </CardStack.Root>
    </StackItem.Content>
  );
};
