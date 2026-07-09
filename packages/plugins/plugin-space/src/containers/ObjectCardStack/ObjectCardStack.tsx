//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useId, useMemo, useState } from 'react';

import { Filter, Obj, type View } from '@dxos/echo';
import { useQuery, useType } from '@dxos/react-client/echo';
import { Card, Message, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { ObjectForm } from '@dxos/react-ui-form';
import { Mosaic, type MosaicEventHandler } from '@dxos/react-ui-mosaic';
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
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(view);
  const typeUri = view.query ? getTypeURIFromQuery(view.query.ast) : undefined;
  const type = useType(db, typeUri);

  const queriedObjects = useQuery(db, type ? Filter.type(type) : Filter.nothing());
  const selectedRows = useSelection(objectId, 'multi');
  const selectedObjects = selectedRows.map((id) => queriedObjects.find((obj) => obj.id === id)).filter(isNonNullable);

  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  // Per-instance discriminator so the same object opened twice doesn't collide in the Mosaic registry.
  const instanceId = useId();
  const eventHandler = useMemo<MosaicEventHandler>(
    () => ({ id: `object-card-stack:${objectId}:${instanceId}`, canDrop: () => true }),
    [objectId, instanceId],
  );

  if (!type) {
    return null;
  }

  return (
    <Panel.Root ref={forwardedRef}>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content>
        {selectedObjects.length === 0 ? (
          <Message.Root>
            <Message.Title>{t('row-details-no-selection.label')}</Message.Title>
          </Message.Root>
        ) : (
          <Mosaic.Container asChild orientation='vertical' autoScroll={viewport} eventHandler={eventHandler}>
            <ScrollArea.Root orientation='vertical' centered>
              <ScrollArea.Viewport ref={setViewport}>
                <Mosaic.Stack
                  draggable={false}
                  // TODO(wittjosiah): Expose gap as a prop.
                  // gap={2}
                  items={selectedObjects}
                  getId={(obj) => obj.id}
                  Tile={({ ...props }) => (
                    <Mosaic.Tile {...props}>
                      <Card.Root fullWidth classNames='pb-form-gap'>
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
});
