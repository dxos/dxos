//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel, ScrollArea, Tag, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';

export type EchoObjectItem = {
  id: string;
  /** Type name (e.g. `Person`, `Organization`, `Thread`). */
  typename: string;
  label: string;
};

export type EchoObjectsListProps = ThemedClassName<{
  objects: EchoObjectItem[];
}>;

/**
 * List of ECHO objects materialized by the pipeline (e.g. `Person` / `Organization` / `Thread`).
 * Presentational: the container resolves objects (via `useQuery` over a space) into this shape.
 */
export const EchoObjectsList = ({ classNames, objects }: EchoObjectsListProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        <Toolbar.Text>Objects{objects.length > 0 ? ` (${objects.length})` : ''}</Toolbar.Text>
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content asChild>
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          {objects.length === 0 ? (
            <Empty label='No objects.' />
          ) : (
            <Listbox.Root>
              <Listbox.Content aria-label='ECHO objects'>
                {objects.map((object) => (
                  <Listbox.Item classNames='gap-2' key={object.id} id={object.id}>
                    <Listbox.ItemLabel>{object.label}</Listbox.ItemLabel>
                    <Tag hue='neutral'>{object.typename}</Tag>
                  </Listbox.Item>
                ))}
              </Listbox.Content>
            </Listbox.Root>
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Content>
  </Panel.Root>
);
