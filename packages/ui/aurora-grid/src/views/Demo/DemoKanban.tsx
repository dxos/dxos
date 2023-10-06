//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/react-client';
import { Expando, TypedObject, useQuery, useSpace } from '@dxos/react-client/echo';
import { arrayMove } from '@dxos/util';

import { Path } from '../../mosaic';
import { SimpleCard } from '../../testing';
import { Kanban, KanbanColumn } from '../Kanban';

export const EchoKanban = ({
  container = 'projects',
  spaceKey,
  debug,
}: {
  container?: string;
  spaceKey: PublicKey;
  debug?: boolean;
}) => {
  const space = useSpace(spaceKey);
  const [kanban] = useQuery(space, { type: 'kanban' });
  const objects = useQuery<TypedObject>(space, (object) => object.__schema === kanban.schema, {}, [kanban.schema]);

  const property = kanban.columnBy;
  const columns: KanbanColumn<TypedObject>[] = kanban.order.map((value: string) => {
    const columnOrder = kanban.columnOrder[value] ?? [];
    const children =
      columnOrder.length > 0 ? columnOrder.map((id: string) => objects.find((object) => object.id === id)) : objects;
    return {
      id: value,
      title: value,
      children: children.filter((object: TypedObject) => object[property] === value),
    };
  });

  const handleDrop = ({ active, over }: any) => {
    // Reorder columns.
    if (active.container === container) {
      const fromIndex = kanban.order.findIndex((value: string) => value === active.item.id);
      const toIndex = kanban.order.findIndex((value: string) => value === over.item.id);
      fromIndex !== -1 && toIndex !== -1 && arrayMove(kanban.order, fromIndex, toIndex);
      return;
    }

    const columnsPath = Path.create(container, 'column');
    if (Path.hasDescendent(columnsPath, active.container)) {
      const activeProperty = Path.last(active.container);
      const overProperty = Path.last(over.container);
      invariant(activeProperty);
      invariant(overProperty);

      // Update property.
      active.item[property] = overProperty;

      // Update active column order.
      const activeOrder =
        kanban.columnOrder[activeProperty] ??
        columns.find((column) => column.id === activeProperty)?.children.map((item) => item.id) ??
        [];
      activeOrder.length > 0 && activeOrder.splice(active.position, 1);
      kanban.columnOrder[activeProperty] = activeOrder;

      // Update over column order.
      const overOrder =
        kanban.columnOrder[overProperty] ??
        columns.find((column) => column.id === overProperty)?.children.map((item) => item.id) ??
        [];
      overOrder.length > 0 ? overOrder.splice(over.position, 0, active.item.id) : overOrder.push(active.item.id);
      kanban.columnOrder[overProperty] = overOrder;
    } else {
      const overProperty = Path.last(over.container);
      invariant(overProperty);

      const obj = new Expando(
        {
          title: active.item.label,
          status: overProperty,
        },
        { schema: kanban.schema },
      );
      space?.db.add(obj);

      const overOrder =
        kanban.columnOrder[overProperty] ??
        columns.find((column) => column.id === overProperty)?.children.map((item) => item.id) ??
        [];
      overOrder.length > 0 ? overOrder.splice(over.position, 0, obj.id) : overOrder.push(obj.id);
      kanban.columnOrder[overProperty] = overOrder;
    }
  };

  return <Kanban id={container} debug={debug} columns={columns} Component={SimpleCard} onDrop={handleDrop} />;
};
