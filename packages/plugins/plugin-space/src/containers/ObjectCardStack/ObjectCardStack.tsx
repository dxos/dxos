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
        <Panel.Header>
          <Toolbar.Root />
        </Panel.Header>
        <Mosaic.Container asChild orientation='vertical' autoScroll={viewport} eventHandler={eventHandler}>
          <Panel.Body asChild>
            <ScrollArea.Root orientation='vertical'>
              {/* The gutter is the viewport's own, so the banner sits where the first card would. */}
              <ScrollArea.Viewport classNames='p-2' ref={setViewport}>
                {selectedObjects.length === 0 ? (
                  <Banner.Root inset={false}>
                    <Banner.Title>{t('row-details-no-selection.label')}</Banner.Title>
                  </Banner.Root>
                ) : (
                  <Mosaic.Stack
                    classNames='gap-2'
                    draggable={false}
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
                )}
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Panel.Body>
        </Mosaic.Container>
      </Panel.Root>
    );
  },
);

ObjectCardStack.displayName = 'ObjectCardStack';
