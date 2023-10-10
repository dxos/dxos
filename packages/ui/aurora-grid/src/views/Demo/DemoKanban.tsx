//
// Copyright 2023 DXOS.org
//

import React, { FC, HTMLAttributes, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/react-client';
import { Expando, TypedObject, useQuery, useSpace } from '@dxos/react-client/echo';
import { arrayMove } from '@dxos/util';

import { TestComponentProps } from './test';
import { Mosaic, MosaicMoveEvent, Path, swapItems } from '../../mosaic';
import { SimpleCard, TestItem, TestObjectGenerator } from '../../testing';
import { Kanban, KanbanColumn } from '../Kanban';

const createKanban = ({ types, columns = 3 }: { types?: string[]; columns?: number }) => {
  const generator = new TestObjectGenerator({ types });
  return Array.from({ length: columns }).map((_, i) => ({
    id: `column-${i}`,
    title: `Column ${i}`,
    children: generator.createObjects({ length: columns - i }),
  }));
};

export const DemoKanban: FC<TestComponentProps<any> & HTMLAttributes<HTMLDivElement>> = ({
  id,
  types,
  debug,
  Component = Mosaic.DefaultComponent,
  className,
}) => {
  const [columns, setColumns] = useState<KanbanColumn<TestItem>[]>(() => createKanban({ types, columns: 3 }));

  const handleDrop = ({ active, over }: MosaicMoveEvent<number>) => {
    // Reorder columns.
    if (active.path === id) {
      return setColumns((columns) => [...swapItems(columns, active.item, over.item)]);
    }

    const columnsPath = Path.create(id, 'column');
    return setColumns((columns) =>
      columns.map((column) => {
        const children = [...column.children];
        if (Path.last(active.path) === column.id) {
          // Remove card from current postion.
          invariant(active.position !== undefined);
          children.splice(active.position, 1);
        }

        if (over.path === id && over.item.id === column.id) {
          // Move card into empty column.
          children.push(active.item as TestItem);
        } else if (Path.hasDescendent(columnsPath, over.path) && Path.last(over.path) === column.id) {
          // Move card within or between columns.
          children.splice(over.position ?? 0, 0, active.item as TestItem);
        }

        return { ...column, children };
      }),
    );
  };

  return <Kanban id={id} Component={Component} columns={columns} onDrop={handleDrop} debug={debug} />;
};

export const EchoKanban = ({
  id = 'projects',
  spaceKey,
  debug,
}: {
  id?: string;
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
    if (active.container === id) {
      const fromIndex = kanban.order.findIndex((value: string) => value === active.item.id);
      const toIndex = kanban.order.findIndex((value: string) => value === over.item.id);
      fromIndex !== -1 && toIndex !== -1 && arrayMove(kanban.order, fromIndex, toIndex);
      return;
    }

    const columnsPath = Path.create(id, 'column');
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

      invariant(space);
      const obj = space.db.add(
        new Expando(
          {
            title: active.item.label,
            status: overProperty,
          },
          { schema: kanban.schema },
        ),
      );

      const overOrder =
        kanban.columnOrder[overProperty] ??
        columns.find((column) => column.id === overProperty)?.children.map((item) => item.id) ??
        [];
      overOrder.length > 0 ? overOrder.splice(over.position, 0, obj.id) : overOrder.push(obj.id);
      kanban.columnOrder[overProperty] = overOrder;
    }
  };

  return <Kanban id={id} Component={SimpleCard} columns={columns} onDrop={handleDrop} debug={debug} />;
};
