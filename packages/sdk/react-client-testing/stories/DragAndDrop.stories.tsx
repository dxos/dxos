//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { Item, Party } from '@dxos/client';
import { ObjectModel, OrderedList } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient, useSelection } from '@dxos/react-client';

import { DroppableList, ProfileInitializer, DNDTypes, Card } from '../src';
import { DragAndDropDebugPanel, ResetButton, StorybookContainer } from './helpers';

export default {
  title: 'react-client-testing/DragAndDrop'
};

const TYPE_LIST = 'example:type/list';
const TYPE_LIST_ITEM = 'example:type/list/item';
const TYPE_TABLE_TABLE = 'dxos:type/table/table';

const ListStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [list, setList] = useState<Item<ObjectModel>>();
  const [orderedList, setOrderedList] = useState<OrderedList>();
  const [initialOrder, setInitialOrder] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const items = useSelection(party?.select()
    .filter({ type: TYPE_LIST_ITEM }),
  [list]) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    const listItem = await newParty.database.createItem({
      model: ObjectModel,
      type: TYPE_LIST
    });

    const res = await Promise.all(Array.from({ length: faker.datatype.number({ min: 20, max: 40 }) }).map(async () => {
      return await newParty?.database.createItem({
        model: ObjectModel,
        type: TYPE_LIST_ITEM,
        props: {
          title: faker.name.firstName()
        }
      });
    }));

    const newOrderedList = new OrderedList(listItem.model);
    await newOrderedList.init(res.map(item => item.id));
    setInitialOrder(res.map(item => item.id));
    setCurrentOrder(res.map(item => item.id));

    setList(listItem);
    setOrderedList(newOrderedList);
    setParty(newParty);
  }, []);

  if (!list || !orderedList) {
    return null;
  }

  const handleMoveItem = (dragIndex: number, hoverIndex: number) => {
    const dragItem = currentOrder[dragIndex];
    if (dragItem) {
      setCurrentOrder(prev => {
        const newOrder = [...prev];
        const itemInHoverPosition = newOrder.splice(hoverIndex, 1, dragItem);
        newOrder.splice(dragIndex, 1, itemInHoverPosition[0]);
        return newOrder;
      });
    }
  };

  const handleDrop = async (dropTargetId: string, dragItemId: string, index?: number) => {
    const newOrder = [
      ...orderedList.values.filter(itemId => itemId !== dragItemId).slice(0, index),
      dragItemId,
      ...orderedList.values.filter(itemId => itemId !== dragItemId).slice(index, orderedList.values.length)
    ];
    await orderedList.init(newOrder);
    setCurrentOrder(newOrder);
  };

  const getListItems = () => currentOrder.map(itemId => {
    const item = items.find(item => item.id === itemId);
    if (item) {
      return { id: item.id, title: item.model.get('title') };
    }
    return null;
  }).filter(Boolean) as Card[];

  const handleReset = async () => {
    await orderedList.init(initialOrder);
    setCurrentOrder(initialOrder);
  };

  return (
    <StorybookContainer style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr'
    }}>
      <DndProvider backend={HTML5Backend}>
        <DroppableList
          id={list.id}
          title='Simple List'
          accept={DNDTypes.LIST_ITEM}
          items={getListItems()}
          onDrop={handleDrop}
          moveItem={handleMoveItem}
        />
      </DndProvider>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 2
      }}>
        <ResetButton onReset={handleReset} />
        <DragAndDropDebugPanel order={list.model.get('order')} party={party} />
      </div>
    </StorybookContainer>
  );
};

export const List = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <ListStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};

// const MultipleListStory = () => {
//   const client = useClient();
//   const [party, setParty] = useState<Party>();
//   const [lists, setLists] = useState<Item<ObjectModel>[]>([]);
//   const [orderedLists, setOrderedLists] = useState<OrderedList[]>();
//   const [initialOrders, setInitialOrders] = useState<{id: string, values: string[]}[]>();
//   const [currentOrders, setCurrentOrders] = useState<{id: string, values: string[]}[]>();
//   const items = useSelection(party?.select().filter({ type: TYPE_LIST_ITEM }), []) ?? [];

//   useAsyncEffect(async () => {
//     const newParty = await client.echo.createParty();

//     const listItems = await Promise.all(Array.from({ length: 3 }).map(async () => {
//       return await newParty.database.createItem({
//         model: ObjectModel,
//         type: TYPE_LIST
//       });
//     }));

//     const newOrderedLists: OrderedList[] = [];
//     await Promise.all(listItems.map(async (listItem) => {
//       const createdItems = await Promise.all(Array.from({ length: faker.datatype.number({ min: 4, max: 20 }) }).map(async (_, i) => {
//         return await newParty?.database.createItem({
//           model: ObjectModel,
//           type: TYPE_LIST_ITEM,
//           props: {
//             title: faker.name.firstName()
//           }
//         });
//       }));
//       const newOrderedList = new OrderedList(listItem.model);
//       await newOrderedList.init(createdItems.map(item => item.id));
//       newOrderedLists.push(newOrderedList);
//     }));

//     setParty(newParty);
//     setLists(listItems);
//     setOrderedLists(newOrderedLists);
//     setCurrentOrders(newOrderedLists.map(orderedList => ({
//       id: orderedList.id,
//       values: orderedList.values
//     })));
//     setInitialOrders(newOrderedLists.map(orderedList => ({
//       id: orderedList.id,
//       values: orderedList.values
//     })));
//   }, []);

//   const getListItems = (listId: string) => {
//     const currentOrder = currentOrders?.find(list => list.id === listId);
//     if (!currentOrder) {
//       return [];
//     }

//     return currentOrder.values.map(itemId => {
//       const item = items.find(item => item.id === itemId);
//       if (item) {
//         return { id: item.id, title: item.model.get('title') };
//       }
//       return null;
//     }).filter(Boolean) as Card[];
//   };

//   const handleDragEnd = async (result: DropResult) => {
//     if (!orderedLists?.length || !result.destination) {
//       return;
//     }
//     const { destination, draggableId, source } = result;
//     const targetOrderedList = orderedLists.find(list => list.id === destination.droppableId);
//     if (!targetOrderedList) {
//       return;
//     }

//     let newSourceOrder: string[];
//     const sourceOrderedList = orderedLists.find(list => list.id === source.droppableId);
//     if (destination.droppableId !== source.droppableId) {
//       // Remove item from source
//       if (sourceOrderedList) {
//         const sourceOrderWithoutId = sourceOrderedList.values.filter(value => value !== draggableId);
//         await sourceOrderedList.init(sourceOrderWithoutId);
//         newSourceOrder = sourceOrderWithoutId;
//       }
//     }

//     const currentOrderWithoutId = targetOrderedList.values.filter(value => value !== draggableId);
//     const newOrder = [
//       ...currentOrderWithoutId.slice(0, destination.index),
//       draggableId,
//       ...currentOrderWithoutId.slice(destination.index, targetOrderedList.values.length)
//     ];
//     await targetOrderedList.init(newOrder);
//     setCurrentOrders(prev => prev?.map(currentOrder => {
//       if (currentOrder.id === targetOrderedList.id) {
//         return {
//           id: currentOrder.id,
//           values: newOrder
//         };
//       }

//       if (sourceOrderedList && newSourceOrder && currentOrder.id === sourceOrderedList.id) {
//         return {
//           id: currentOrder.id,
//           values: newSourceOrder
//         };
//       }

//       return currentOrder;
//     }));
//   };

//   const handleReset = async () => {
//     if (!initialOrders || !orderedLists) {
//       return;
//     }

//     await Promise.all(orderedLists.map(async (orderedList) => {
//       const initialOrder = initialOrders.find(order => order.id === orderedList.id);
//       initialOrder && await orderedList?.init(initialOrder.values);
//     }));

//     // Update state to trigger rerender
//     setCurrentOrders(orderedLists.map(orderedList => {
//       const initialOrder = initialOrders.find(order => order.id === orderedList.id);
//       if (!initialOrder) {
//         return orderedList;
//       }
//       return initialOrder;
//     }));
//   };

//   if (!party || !lists.length) {
//     return null;
//   }

//   return (
//     <StorybookContainer style={{
//       display: 'grid',
//       gridTemplateColumns: [...lists.map(() => '1fr'), '0.1fr'].join(' '),
//       columnGap: 8
//     }}>
//       <DragDropContext onDragEnd={handleDragEnd}>
//         {lists.map(list => (
//           <ColumnContainer
//             key={list.id}
//             topComponent={(
//               <DroppableList
//                 id={list.id}
//                 items={getListItems(list.id)}
//               />
//             )}
//             bottomComponent={(
//               <DragAndDropDebugPanel
//                 order={list.model.get('order')}
//               />
//             )}
//             config={{
//               fixedComponent: 'bottom',
//               height: '300px'
//             }}
//           />
//         ))}
//       </DragDropContext>
//       <ResetButton onReset={handleReset} />
//     </StorybookContainer>
//   );
// };

// export const MultipleList = () => {
//   return (
//     <ClientProvider>
//       <ProfileInitializer>
//         <MultipleListStory />
//       </ProfileInitializer>
//     </ClientProvider>
//   );
// };

// const TYPE_TEST_PERSON = 'example:type/person';
// const columns = [
//   {
//     accessor: 'id',
//     title: 'Id'
//   },
//   {
//     accessor: 'title',
//     title: 'Title'
//   },
//   {
//     accessor: 'country',
//     title: 'Country'
//   },
//   {
//     accessor: 'role',
//     title: 'Role'
//   },
//   {
//     accessor: 'email',
//     title: 'Email'
//   }
// ];

// const TableStory = () => {
//   const client = useClient();
//   const [party, setParty] = useState<Party>();
//   const [table, setTable] = useState<Item<ObjectModel>>();
//   const [initialRowOrder, setInitialRowOrder] = useState<string[]>([]);
//   const [rowOrderedList, setRowOrderedList] = useState<OrderedList>();
//   const [rowOrder, setRowOrder] = useState<string[]>([]);
//   const [initialColumnOrder, setInitialColumnOrder] = useState<string[]>([]);
//   const [columnOrderedList, setColumnOrderedList] = useState<OrderedList>();
//   const [columnOrder, setColumnOrder] = useState<string[]>([]);

//   const items = useSelection(party?.select()
//     .filter({ type: TYPE_TEST_PERSON }),
//   []) ?? [];

//   useAsyncEffect(async () => {
//     const newParty = await client.echo.createParty();
//     const tableItem = await newParty.database.createItem({
//       model: ObjectModel,
//       type: TYPE_TABLE_TABLE
//     });

//     const createdItems = await Promise.all(Array.from({ length: 40 }).map(async () => await newParty?.database.createItem({
//       type: TYPE_TEST_PERSON,
//       props: {
//         title: faker.name.firstName(),
//         country: faker.address.country(),
//         role: faker.name.jobTitle(),
//         email: faker.internet.email()
//       }
//     })));
//     const newRowOrderedList = new OrderedList(tableItem.model, 'rowOrder');
//     await newRowOrderedList.init(createdItems.map(item => item.id));
//     const newColumnOrderedList = new OrderedList(tableItem.model, 'columnOrder');
//     await newColumnOrderedList.init(columns.map(column => column.accessor));

//     setParty(newParty);
//     setTable(tableItem);
//     setRowOrderedList(newRowOrderedList);
//     setRowOrder(newRowOrderedList.values);
//     setColumnOrderedList(newColumnOrderedList);
//     setColumnOrder(newColumnOrderedList.values);
//     setInitialRowOrder(newRowOrderedList.values);
//     setInitialColumnOrder(newColumnOrderedList.values);
//   }, []);

//   const handleDragEnd = async (result: DropResult) => {
//     const { destination, draggableId, source } = result;
//     if (destination?.droppableId === 'columns') {
//       const column = columns.find(column => column.accessor === draggableId);
//       if (!column) {
//         return;
//       }

//       const columnsWithoutId = columns.filter(col => col.accessor !== column?.accessor);
//       const newColumns = [
//         ...columnsWithoutId.slice(0, destination.index),
//         column,
//         ...columnsWithoutId.slice(destination.index, columns.length)
//       ];
//       setColumnOrder(newColumns.map(column => column.accessor));
//       return;
//     }
//     if (
//       !rowOrderedList ||
//       !destination ||
//       destination.index === source.index
//     ) {
//       return;
//     }

//     const currentOrderWithoutId = rowOrderedList.values.filter(value => value !== draggableId);
//     const newOrder = [
//       ...currentOrderWithoutId.slice(0, destination.index),
//       draggableId,
//       ...currentOrderWithoutId.slice(destination.index, rowOrderedList.values.length)
//     ];
//     await rowOrderedList.init(newOrder);
//     setRowOrder(newOrder);
//   };

//   const handleReset = async () => {
//     await rowOrderedList!.init(initialRowOrder);
//     setRowOrder(initialRowOrder);
//     await columnOrderedList!.init(initialColumnOrder);
//     setColumnOrder(initialColumnOrder);
//   };

//   const getRows = () => {
//     return rowOrder!.map(itemId => {
//       const item = items.find(item => item.id === itemId);
//       if (item) {
//         return { id: item.id, ...item.model.toObject() };
//       }
//       return null;
//     }).filter(Boolean);
//   };

//   if (!table || !rowOrderedList) {
//     return null;
//   }

//   return (
//     <div style={{
//       display: 'grid',
//       gridTemplateColumns: '1fr 0.1fr',
//       height: 'calc(100vh - 16px)'
//     }}>
//       <DragDropContext onDragEnd={handleDragEnd}>
//         <DraggableTable
//           id={table.id}
//           columns={columns}
//           columnOrder={columnOrder}
//           rows={getRows()}
//         />
//       </DragDropContext>
//       <ResetButton onReset={handleReset} />
//     </div>
//   );
// };

// export const Table = () => {
//   return (
//     <ClientProvider>
//       <ProfileInitializer>
//         <TableStory />
//       </ProfileInitializer>
//     </ClientProvider>
//   );
// };
