//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useId, useMemo, useState } from 'react';

import { type Database, Filter, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { type DndContainerHandler } from '@dxos/react-ui-dnd';
import { ObjectForm } from '@dxos/react-ui-form/next';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { Next } from '@dxos/react-ui/next';
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
      <Next.Panel.Root ref={forwardedRef}>
        <Next.Panel.Header>
          <Next.Toolbar.Root />
        </Next.Panel.Header>
        <Next.Panel.Body>
          {selectedObjects.length === 0 ? (
            <Next.Banner.Root>
              <Next.Banner.Title>{t('row-details-no-selection.label')}</Next.Banner.Title>
            </Next.Banner.Root>
          ) : (
            <Mosaic.Container asChild orientation='vertical' autoScroll={viewport} eventHandler={eventHandler}>
              <Next.ScrollArea.Root orientation='vertical'>
                <Next.ScrollArea.Viewport ref={setViewport}>
                  <Mosaic.Stack
                    classNames='py-trim-md gap-trim-md'
                    draggable={false}
                    items={selectedObjects}
                    getId={(obj) => obj.id}
                    Tile={({ ...props }) => (
                      <Mosaic.Tile {...props}>
                        <Next.Card.Root gutter='sm'>
                          <ObjectForm object={props.data} type={type} />
                        </Next.Card.Root>
                      </Mosaic.Tile>
                    )}
                  />
                </Next.ScrollArea.Viewport>
              </Next.ScrollArea.Root>
            </Mosaic.Container>
          )}
        </Next.Panel.Body>
      </Next.Panel.Root>
    );
  },
);

ObjectCardStack.displayName = 'ObjectCardStack';
