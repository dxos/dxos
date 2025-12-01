//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { Callout, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Card, StackItem } from '@dxos/react-ui-stack';
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

  // TODO(burdon): Should be part of container.
  if (selectedObjects.length === 0) {
    return (
      <CardStack>
        <Callout.Root>
          <Callout.Title>{t('row details no selection label')}</Callout.Title>
        </Callout.Root>
      </CardStack>
    );
  }

  return (
    // TODO(burdon): What is the actual container? That has overflow-y-auto? (i.e., the equivalent of StackItem.Content for articles).
    <StackItem.Content toolbar>
      <Toolbar.Root />
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          <CardStack>
            {selectedObjects.map((object) => (
              <Card.StaticRoot key={object.id}>
                <ObjectForm object={object} schema={schema} />
              </Card.StaticRoot>
            ))}
          </CardStack>
          <ScrollArea.Scrollbar orientation='vertical'>
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </StackItem.Content>
  );
};

// TODO(burdon): Factor out.
const CardStack = ({ children }: PropsWithChildren) => {
  return (
    // TODO(burdon): Classnames for gap?
    <div role='none' className='bs-full is-full flex flex-col p-2 gap-2'>
      {children}
    </div>
  );
};
