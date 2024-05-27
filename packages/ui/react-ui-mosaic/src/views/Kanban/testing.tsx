//
// Copyright 2023 DXOS.org
//

import React, { type FC, useState } from 'react';

import { invariant } from '@dxos/invariant';

import { Kanban, type KanbanColumn, type KanbanProps } from './Kanban';
import { Mosaic, type MosaicDropEvent, Path, swapItems } from '../../mosaic';
import { TestObjectGenerator, Priority, Status, type TestItem } from '../../testing';

const createKanban = ({ types, columns = 3 }: { types?: string[]; columns?: number }) => {
  const generator = new TestObjectGenerator({ types });
  return Array.from({ length: columns }).map((_, i) => ({
    id: `column-${i}`,
    title: `Column ${i}`,
    items: generator.createObjects({ length: 3 + columns - i }),
  }));
};

export type DemoKanbanProps = Omit<KanbanProps, 'columns'> & {
  types?: string[];
  count?: number;
  debug?: boolean;
};

export const DemoKanban: FC<DemoKanbanProps> = ({
  id = 'kanban',
  Component = Mosaic.DefaultComponent,
  types = ['document'],
  count = 3,
  debug = false,
}) => {
  const [columns, setColumns] = useState<KanbanColumn<TestItem>[]>(() => createKanban({ types, columns: count }));

  // const handleDelete = (id: string) => {
  //   setItems1((cards) => cards.filter((card) => card.id !== id));
  // };

  // TODO(burdon): Reconcile with DemoKanban.
  const handleDrop = ({ active, over }: MosaicDropEvent<number>) => {
    // Reorder columns.
    // TODO(burdon): Buggy dragging empty column.
    if (active.path === Path.create(id, active.item.id)) {
      return setColumns((columns) => [...swapItems(columns, active.item, over.item)]);
    }

    return setColumns((columns) =>
      columns.map((column) => {
        const items = [...column.items];
        if (Path.last(Path.parent(active.path)) === column.id) {
          // Remove card from current postion.
          invariant(active.position !== undefined);
          items.splice(active.position, 1);
        }

        if (over.path === Path.create(id, column.id)) {
          // Move card to end of column.
          items.push(active.item as TestItem);
        } else if (Path.hasDescendent(id, over.path) && Path.last(Path.parent(over.path)) === column.id) {
          // Move card within or between columns.
          const position = over.position ?? items.length;
          items.splice(position, 0, active.item as TestItem);
        }

        return { ...column, items };
      }),
    );
  };

  return <Kanban id={id} columns={columns} Component={Component} onDrop={handleDrop} debug={debug} />;
};

// TODO(burdon): Compute this?
export const columnValues: { [property: string]: any[] } = {
  status: ['unknown', ...Status],
  priority: ['unknown', ...Priority],
};

// TODO(wittjosiah): Update to use effect schema.
// export const EchoKanban = ({
//   id,
//   spaceKey,
//   generator,
//   debug,
// }: {
//   id: string;
//   spaceKey: PublicKey;
//   generator: TestObjectGenerator;
//   debug?: boolean;
// }) => {
//   const space = useSpace(spaceKey);
//   // TODO(burdon): Decorator is not re-run schema is empty when returning to story after first run. Different kanban id.
//   const [kanban] = useQuery(space, { type: 'kanban' });

//   const getProperty = (property: string) => {
//     const schemaProperty = kanban.schema.props.find((prop: any) => prop.id === kanban.columnProp);
//     if (schemaProperty.type === Schema.PropType.NUMBER) {
//       return parseInt(property);
//     } else {
//       return property;
//     }
//   };

//   const objects = useQuery<TypedObject>(space, (object) => object.__schema === kanban.schema, {}, [kanban.schema]);
//   const columns: KanbanColumn<TypedObject>[] = kanban.columnValues.map((value: string) => {
//     const objectPosition = kanban.objectPosition[value] ?? [];
//     const items =
//       objectPosition.length > 0
//         ? objectPosition.map((id: string) => objects.find((object) => object.id === id))
//         : objects;

//     // TODO(burdon): Special case for 'unknown' values?
//     return {
//       id: getProperty(value),
//       title: value,
//       items: items.filter((object: TypedObject) => object[kanban.columnProp] === value),
//     };
//   });

//   // TODO(burdon): Why ref?
//   const columnsRef = useRef<KanbanColumn<TypedObject>[]>([]);
//   columnsRef.current = columns;

//   // TODO(burdon): Called for each object generated (should batch?)
//   // console.log(JSON.stringify(objects[0]));

//   // TODO(burdon): Should views maintain an positional index map per property (to enable switching?)
//   // TODO(burdon): Is the current index map making use of ECHO object CRDT? Need multi-peer test in this suite.
//   const handleSetProperty = (property: string) => {
//     kanban.columnProp = property;
//     kanban.columnValues = columnValues[kanban.columnProp];
//   };

//   // TODO(burdon): Factor out util.
//   const getOrder = (kanban: TypedObject, property: string) => {
//     // TODO(wittjosiah): Columns is stale here.
//     return (
//       kanban.objectPosition[property] ??
//       columnsRef.current.find((column) => column.id === getProperty(property))?.items.map((item) => item.id) ??
//       []
//     );
//   };

//   // TODO(burdon): Currently broken: factor out with demo story.
//   const handleDrop = ({ active, over }: MosaicDropEvent<number>) => {
//     // Reorder columns.
//     // TODO(burdon): Factor out util.
//     if (active.path === Path.create(id, active.item.id)) {
//       // Reorder columns.
//       const fromIndex = kanban.columnValues.findIndex((value: string) => value === active.item.id);
//       const toIndex = kanban.columnValues.findIndex((value: string) => value === over.item.id);
//       fromIndex !== -1 && toIndex !== -1 && arrayMove(kanban.columnValues, fromIndex, toIndex);
//       return;
//     }

//     if (Path.hasDescendent(id, active.path)) {
//       const activeProperty = Path.last(Path.parent(active.path));
//       const overProperty = Path.length(over.path) > 2 ? Path.last(Path.parent(over.path)) : Path.last(over.path);
//       invariant(activeProperty);
//       invariant(overProperty);

//       // Update property.
//       (active.item as TypedObject)[kanban.columnProp] = getProperty(overProperty);

//       // Update active column order.
//       const activeOrder = getOrder(kanban, activeProperty);
//       activeOrder.length > 0 && activeOrder.splice(active.position, 1);
//       kanban.objectPosition[activeProperty] = activeOrder;

//       // Update over column order.
//       const overOrder = getOrder(kanban, overProperty);
//       overOrder.length > 0 && Path.length(over.path) === Path.length(active.path)
//         ? overOrder.splice(over.position, 0, active.item.id)
//         : overOrder.push(active.item.id);
//       kanban.objectPosition[overProperty] = overOrder;
//     }
//   };

//   const handleAddData = () => {
//     const object = generator.createObject({ types: ['project'] });
//     space?.db.add(object);
//   };

//   return (
//     <div className='flex flex-col grow'>
//       <Toolbar.Root classNames='p-2'>
//         <PropertySelector
//           property={kanban.columnProp}
//           properties={Object.keys(columnValues)}
//           onSetProperty={handleSetProperty}
//         />
//         <Button title='Add Data' onClick={handleAddData}>
//           <Plus />
//         </Button>
//       </Toolbar.Root>
//       <Kanban id={id} columns={columns} Component={SimpleCard} onDrop={handleDrop} debug={debug} />
//     </div>
//   );
// };

// const PropertySelector: FC<{ property: string; properties: string[]; onSetProperty: (property: string) => void }> = ({
//   property,
//   properties,
//   onSetProperty,
// }) => {
//   return (
//     <Select.Root value={property} onValueChange={onSetProperty}>
//       <Select.TriggerButton placeholder='Select value' />
//       <Select.Portal>
//         <Select.Content>
//           <Select.ScrollUpButton />
//           <Select.Viewport>
//             {properties.map((property) => (
//               <Select.Option key={property} value={property}>
//                 {property}
//               </Select.Option>
//             ))}
//           </Select.Viewport>
//           <Select.ScrollDownButton />
//           <Select.Arrow />
//         </Select.Content>
//       </Select.Portal>
//     </Select.Root>
//   );
// };
