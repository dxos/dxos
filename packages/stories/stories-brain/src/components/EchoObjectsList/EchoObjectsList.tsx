//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Listbox } from '@dxos/react-ui-list';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

export type EchoObjectItem = {
  id: string;
  /** Type name (e.g. `Person`, `Organization`, `Thread`). */
  typename: string;
  label: string;
};

export type EchoObjectsListProps = Util.ThemedClassName<{
  objects: EchoObjectItem[];
}>;

/**
 * List of ECHO objects materialized by the pipeline (e.g. `Person` / `Organization` / `Thread`).
 * Presentational: the container resolves objects (via `useQuery` over a space) into this shape.
 */
export const EchoObjectsList = ({ classNames, objects }: EchoObjectsListProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Header>
      <Toolbar.Root>
        <Toolbar.Text>Objects{objects.length > 0 ? ` (${objects.length})` : ''}</Toolbar.Text>
      </Toolbar.Root>
    </Panel.Header>
    <Panel.Body asChild>
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          {objects.length === 0 ? (
            <Status.Empty>No objects.</Status.Empty>
          ) : (
            <Listbox.Root items={objects.map((object) => ({ value: object.id, label: object.label }))}>
              <Listbox.Content aria-label='ECHO objects'>
                {objects.map((object) => (
                  <Listbox.Item classNames='gap-2' key={object.id} id={object.id}>
                    <Listbox.ItemText>{object.label}</Listbox.ItemText>
                    <Tag.Tag hue='neutral'>{object.typename}</Tag.Tag>
                  </Listbox.Item>
                ))}
              </Listbox.Content>
            </Listbox.Root>
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Body>
  </Panel.Root>
);
