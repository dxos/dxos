//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { Obj } from '@dxos/echo';
import { Filter, useQuery, useSchema } from '@dxos/react-client/echo';
import { Callout, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Card } from '@dxos/react-ui-mosaic';
import { CardStack, StackItem } from '@dxos/react-ui-stack';
import { type View, getTypenameFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

import { ObjectForm } from './ObjectForm';

export type ObjectCardStackProps = {
  objectId: string;
  view: View.View;
};

export const ObjectCardStack = forwardRef<HTMLDivElement, ObjectCardStackProps>(({ objectId, view }, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(view);
  const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(db, typename);

  const queriedObjects = useQuery(db, schema ? Filter.type(schema) : Filter.nothing());
  const selectedRows = useSelected(objectId, 'multi');
  const selectedObjects = selectedRows.map((id) => queriedObjects.find((obj) => obj.id === id)).filter(isNonNullable);

  if (!schema) {
    return null;
  }

  return (
    <StackItem.Content toolbar ref={forwardedRef}>
      <Toolbar.Root></Toolbar.Root>
      <CardStack.Root asChild>
        <CardStack.Content>
          <CardStack.Stack id={objectId} itemsCount={selectedObjects.length}>
            {selectedObjects.length === 0 && (
              <CardStack.Item>
                <Callout.Root>
                  <Callout.Title>{t('row details no selection label')}</Callout.Title>
                </Callout.Root>
              </CardStack.Item>
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
});
