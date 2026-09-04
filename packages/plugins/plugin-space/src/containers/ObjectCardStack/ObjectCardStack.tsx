//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useId, useMemo, useState } from 'react';

import { type Database, Filter, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Banner, Card, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { type DndContainerHandler } from '@dxos/react-ui-dnd';
import { ObjectForm } from '@dxos/react-ui-form';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

export type ObjectCardStackProps = {
  db: Database.Database;
  type: Type.AnyEntity;
  objectId: string;
};

/**
 * @deprecated Use Mosaic Board components.
 */
export const ObjectCardStack = forwardRef<HTMLDivElement, ObjectCardStackProps>(
  ({ objectId, db, type }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);

    const queriedObjects = useQuery(db, Filter.type(Type.getURI(type)));
    const selectedRows = useSelection(objectId, 'multi');
    const selectedObjects = selectedRows.map((id) => queriedObjects.find((obj) => obj.id === id)).filter(isNonNullable);

    const [viewport, setViewport] = useState<HTMLElement | null>(null);

    // Per-instance discriminator so the same object opened twice doesn't collide in the Mosaic registry.
    const instanceId = useId();
    const eventHandler = useMemo<DndContainerHandler>(
      () => ({ id: `object-card-stack:${objectId}:${instanceId}`, canDrop: () => true }),
      [objectId, instanceId],
    );

    return (
      <Panel.Root ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content>
          {selectedObjects.length === 0 ? (
            <Banner.Root>
              <Banner.Content classNames='m-trim-md'>
                <Banner.Title>{t('row-details-no-selection.label')}</Banner.Title>
              </Banner.Content>
            </Banner.Root>
          ) : (
            <Mosaic.Container asChild orientation='vertical' autoScroll={viewport} eventHandler={eventHandler}>
              <ScrollArea.Root orientation='vertical' centered padding>
                <ScrollArea.Viewport ref={setViewport}>
                  <Mosaic.Stack
                    classNames='py-trim-md gap-trim-md'
                    draggable={false}
                    items={selectedObjects}
                    getId={(obj) => obj.id}
                    Tile={({ ...props }) => (
                      <Mosaic.Tile {...props}>
                        <Card.Root fullWidth gutter='sm'>
                          <ObjectForm object={props.data} type={type} />
                        </Card.Root>
                      </Mosaic.Tile>
                    )}
                  />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          )}
        </Panel.Content>
      </Panel.Root>
    );
  },
);

ObjectCardStack.displayName = 'ObjectCardStack';
