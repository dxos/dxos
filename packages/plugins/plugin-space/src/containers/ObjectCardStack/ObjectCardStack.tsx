//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useState } from 'react';

import { Filter, Obj, type View } from '@dxos/echo';
import { useQuery, useType } from '@dxos/react-client/echo';
import { Card, Message, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { ObjectForm } from '@dxos/react-ui-form';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { getTypeURIFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

export type ObjectCardStackProps = {
  view: View.View;
  objectId: string;
};

/**
 * @deprecated Use Mosaic Board components.
 */
export const ObjectCardStack = forwardRef<HTMLDivElement, ObjectCardStackProps>(({ objectId, view }, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(view);
  const typeUri = view.query ? getTypeURIFromQuery(view.query.ast) : undefined;
  const type = useType(db, typeUri);

  const queriedObjects = useQuery(db, type ? Filter.type(type) : Filter.nothing());
  const selectedRows = useSelected(objectId, 'multi');
  const selectedObjects = selectedRows.map((id) => queriedObjects.find((obj) => obj.id === id)).filter(isNonNullable);

  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  if (!type) {
    return null;
  }

  return (
    <Panel.Root className='dx-document' ref={forwardedRef}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content>
        {selectedObjects.length === 0 ? (
          <Message.Root>
            <Message.Title>{t('row-details-no-selection.label')}</Message.Title>
          </Message.Root>
        ) : (
          <Mosaic.Root>
            <Mosaic.Container
              asChild
              orientation='vertical'
              autoScroll={viewport}
              eventHandler={{ id: objectId, canDrop: () => true }}
            >
              <ScrollArea.Root orientation='vertical'>
                <ScrollArea.Viewport ref={setViewport}>
                  <Mosaic.Stack
                    items={selectedObjects}
                    getId={(obj) => obj.id}
                    Tile={({ ...props }) => (
                      <Mosaic.Tile {...props}>
                        <Card.Root>
                          <ObjectForm object={props.data} type={type} />
                        </Card.Root>
                      </Mosaic.Tile>
                    )}
                  />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          </Mosaic.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
});
