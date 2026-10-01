//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { Next } from '@dxos/react-ui/next';

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
  <Next.Panel.Root classNames={classNames}>
    <Next.Panel.Header>
      <Next.Toolbar.Root>
        <Next.Toolbar.Text>Objects{objects.length > 0 ? ` (${objects.length})` : ''}</Next.Toolbar.Text>
      </Next.Toolbar.Root>
    </Next.Panel.Header>
    <Next.Panel.Body asChild>
      <Next.ScrollArea.Root>
        <Next.ScrollArea.Viewport>
          {objects.length === 0 ? (
            <Next.Empty>No objects.</Next.Empty>
          ) : (
            <Listbox.Root items={objects.map((object) => ({ value: object.id, label: object.label }))}>
              <Listbox.Content aria-label='ECHO objects'>
                {objects.map((object) => (
                  <Listbox.Item classNames='gap-2' key={object.id} id={object.id}>
                    <Listbox.ItemText>{object.label}</Listbox.ItemText>
                    <Next.Tag hue='neutral'>{object.typename}</Next.Tag>
                  </Listbox.Item>
                ))}
              </Listbox.Content>
            </Listbox.Root>
          )}
        </Next.ScrollArea.Viewport>
      </Next.ScrollArea.Root>
    </Next.Panel.Body>
  </Next.Panel.Root>
);
