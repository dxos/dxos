//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';

import { Item, Party } from '@dxos/client';
import { ObjectModel, OrderedList } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient, useSelection } from '@dxos/react-client';

import { DraggableTable, DroppableList, Card, List as ListDef, ProfileInitializer } from '../src';
import { ColumnContainer, DragAndDropDebugPanel, ResetButton, StorybookContainer } from './helpers';

export default {
  title: 'react-client-testing/DragAndDrop'
};

const TYPE_LIST = 'example:type/list';
const TYPE_LIST_ITEM = 'example:type/list/item';
const TYPE_TABLE_TABLE = 'dxos:type/table/table';

type ListStruct = {
  id: string
  list: Item<ObjectModel>
  orderedList: OrderedList | undefined
  // TODO(kaplanski): Check how ordered lists work. To trigger a rerender, we need a useState.
  currentOrder: string[]
}

const ListStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [list, setList] = useState<ListStruct>();
  const [initialOrder, setInitialOrder] = useState<string[]>([]);
  const items = useSelection(party?.select()
    .filter({ type: TYPE_LIST_ITEM }),
  [list]) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    const listItem = await newParty.database.createItem({
      model: ObjectModel,
      type: TYPE_LIST
    });

    const res = await Promise.all(Array.from({ length: faker.datatype.number({ min: 10, max: 30 }) }).map(async () => {
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
    setInitialOrder(newOrderedList.values);

    setParty(newParty);
    setList({
      id: listItem.id,
      list: listItem,
      orderedList: newOrderedList,
      currentOrder: newOrderedList.values
    });
  }, []);

  const getList = (): ListDef => ({
    id: 'test-list',
    title: 'People',
    children: list!.currentOrder.map(itemId => {
      const item = items.find(item => item.id === itemId);
      if (item) {
        return { id: item.id, title: item.model.get('title') };
      }
      return null;
    }).filter(Boolean) as Card[]
  });

  const handleDragEnd = async (result: DropResult) => {
    if (!list?.orderedList || !result.destination) {
      return;
    }

    const { destination, draggableId } = result;
    const currentOrderWithoutId = list.orderedList.values.filter(value => value !== draggableId);
    const newOrder = [
      ...currentOrderWithoutId.slice(0, destination.index),
      draggableId,
      ...currentOrderWithoutId.slice(destination.index, list.orderedList.values.length)
    ];
    await list.orderedList.init(newOrder);
    setList({
      ...list,
      currentOrder: newOrder
    });
  };

  const handleReset = async () => {
    if (!list) {
      return;
    }
    await list.orderedList?.init(initialOrder);
    setList({
      ...list,
      currentOrder: initialOrder
    });
  };

  if (!list) {
    return null;
  }

  return (
    <StorybookContainer style={{
      display: 'grid',
      gridTemplateColumns: '1fr 0.1fr'
    }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <DroppableList list={getList()} />
      </DragDropContext>
      <div>
        <ResetButton onReset={handleReset} />
        <DragAndDropDebugPanel
          order={list.list.model.get('order')}
        />
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

const MultipleListStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [lists, setLists] = useState<ListStruct[]>([]);
  const [initialOrders, setInitialOrders] = useState<{id: string, values: string[]}[]>();
  const items = useSelection(party?.select().filter({ type: TYPE_LIST_ITEM }), []) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();

    const listItems = await Promise.all(Array.from({ length: 3 }).map(async () => {
      return await newParty.database.createItem({
        model: ObjectModel,
        type: TYPE_LIST
      });
    }));

    const newOrderedLists: OrderedList[] = [];
    await Promise.all(listItems.map(async (listItem) => {
      const createdItems = await Promise.all(Array.from({ length: faker.datatype.number({ min: 4, max: 20 }) }).map(async (_, i) => {
        return await newParty?.database.createItem({
          model: ObjectModel,
          type: TYPE_LIST_ITEM,
          props: {
            title: faker.name.firstName()
          }
        });
      }));
      const newOrderedList = new OrderedList(listItem.model);
      await newOrderedList.init(createdItems.map(item => item.id));
      newOrderedLists.push(newOrderedList);
    }));

    setParty(newParty);
    setLists(listItems.map(listItem => {
      const orderedList = newOrderedLists.find(orderedList => orderedList.id === listItem.id);
      return {
        id: listItem.id,
        list: listItem,
        orderedList,
        currentOrder: orderedList?.values ?? []
      };
    }));
    setInitialOrders(newOrderedLists.map(orderedList => ({
      id: orderedList.id,
      values: orderedList.values
    })));
  }, []);

  const getList = (listId: string): ListDef | undefined => {
    const list = lists.find(list => list.id === listId);
    if (!list) {
      return undefined;
    }

    return {
      id: list.id,
      title: 'People',
      children: list.currentOrder.map(itemId => {
        const item = items.find(item => item.id === itemId);
        if (item) {
          return { id: item.id, title: item.model.get('title') };
        }
        return null;
      }).filter(Boolean) as Card[]
    };
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!lists.length || !result.destination) {
      return;
    }
    const { destination, draggableId, source } = result;
    const targetList = lists.find(list => list.id === destination.droppableId);
    if (!targetList || !targetList.orderedList) {
      return;
    }

    let newSourceOrder: string[];
    const sourceList = lists.find(list => list.id === source.droppableId);
    if (destination.droppableId !== source.droppableId) {
      // Remove item from source
      if (sourceList?.orderedList) {
        const sourceOrderWithoutId = sourceList.orderedList.values.filter(value => value !== draggableId);
        await sourceList.orderedList.init(sourceOrderWithoutId);
        newSourceOrder = sourceOrderWithoutId;
      }
    }

    const currentOrderWithoutId = targetList.orderedList.values.filter(value => value !== draggableId);
    const newOrder = [
      ...currentOrderWithoutId.slice(0, destination.index),
      draggableId,
      ...currentOrderWithoutId.slice(destination.index, targetList.orderedList.values.length)
    ];
    await targetList.orderedList.init(newOrder);
    setLists(prev => prev.map(list => {
      if (list.id === targetList.id) {
        return {
          ...targetList,
          currentOrder: newOrder
        };
      }

      if (sourceList && newSourceOrder && list.id === sourceList.id) {
        return {
          ...sourceList,
          currentOrder: newSourceOrder
        };
      }

      return list;
    }));
  };

  const handleReset = async () => {
    if (!initialOrders) {
      return;
    }

    await Promise.all(lists.map(async (list) => {
      const initialOrder = initialOrders.find(order => order.id === list.id);
      initialOrder && await list.orderedList?.init(initialOrder.values);
    }));

    // Update state to trigger rerender
    setLists(lists.map(list => {
      const initialOrder = initialOrders.find(order => order.id === list.id);
      if (!initialOrder) {
        return list;
      }
      return {
        ...list,
        currentOrder: initialOrder.values
      };
    }));
  };

  if (!party || !lists.length) {
    return null;
  }

  return (
    <StorybookContainer style={{
      display: 'grid',
      gridTemplateColumns: [...lists.map(() => '1fr'), '0.1fr'].join(' '),
      columnGap: 8
    }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        {lists.map(list => (
          <ColumnContainer
            key={list.id}
            topComponent={<DroppableList list={getList(list.id)} />}
            bottomComponent={(
              <DragAndDropDebugPanel
                order={list.list.model.get('order')}
              />
            )}
            config={{
              fixedComponent: 'bottom',
              height: '300px'
            }}
          />
        ))}
      </DragDropContext>
      <ResetButton onReset={handleReset} />
    </StorybookContainer>
  );
};

export const MultipleList = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <MultipleListStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};

const TYPE_TEST_PERSON = 'example:type/person';
const columns = [
  {
    accessor: 'id',
    title: 'Id'
  },
  {
    accessor: 'title',
    title: 'Title'
  },
  {
    accessor: 'country',
    title: 'Country'
  },
  {
    accessor: 'role',
    title: 'Role'
  },
  {
    accessor: 'email',
    title: 'Email'
  }
];

const TableStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [table, setTable] = useState<Item<ObjectModel>>();
  const [initialRowOrder, setInitialRowOrder] = useState<string[]>([]);
  const [rowOrderedList, setRowOrderedList] = useState<OrderedList>();
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  const [initialColumnOrder, setInitialColumnOrder] = useState<string[]>([]);
  const [columnOrderedList, setColumnOrderedList] = useState<OrderedList>();
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  const items = useSelection(party?.select()
    .filter({ type: TYPE_TEST_PERSON }),
  []) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    const tableItem = await newParty.database.createItem({
      model: ObjectModel,
      type: TYPE_TABLE_TABLE
    });

    const createdItems = await Promise.all(Array.from({ length: 40 }).map(async () => await newParty?.database.createItem({
      type: TYPE_TEST_PERSON,
      props: {
        title: faker.name.firstName(),
        country: faker.address.country(),
        role: faker.name.jobTitle(),
        email: faker.internet.email()
      }
    })));
    const newRowOrderedList = new OrderedList(tableItem.model, 'rowOrder');
    await newRowOrderedList.init(createdItems.map(item => item.id));
    const newColumnOrderedList = new OrderedList(tableItem.model, 'columnOrder');
    await newColumnOrderedList.init(columns.map(column => column.accessor));

    setParty(newParty);
    setTable(tableItem);
    setRowOrderedList(newRowOrderedList);
    setRowOrder(newRowOrderedList.values);
    setColumnOrderedList(newColumnOrderedList);
    setColumnOrder(newColumnOrderedList.values);
    setInitialRowOrder(newRowOrderedList.values);
    setInitialColumnOrder(newColumnOrderedList.values);
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId, source } = result;
    if (destination?.droppableId === 'columns') {
      const column = columns.find(column => column.accessor === draggableId);
      if (!column) {
        return;
      }

      const columnsWithoutId = columns.filter(col => col.accessor !== column?.accessor);
      const newColumns = [
        ...columnsWithoutId.slice(0, destination.index),
        column,
        ...columnsWithoutId.slice(destination.index, columns.length)
      ];
      setColumnOrder(newColumns.map(column => column.accessor));
      return;
    }
    if (
      !rowOrderedList ||
      !destination ||
      destination.index === source.index
    ) {
      return;
    }

    const currentOrderWithoutId = rowOrderedList.values.filter(value => value !== draggableId);
    const newOrder = [
      ...currentOrderWithoutId.slice(0, destination.index),
      draggableId,
      ...currentOrderWithoutId.slice(destination.index, rowOrderedList.values.length)
    ];
    await rowOrderedList.init(newOrder);
    setRowOrder(newOrder);
  };

  const handleReset = async () => {
    await rowOrderedList!.init(initialRowOrder);
    setRowOrder(initialRowOrder);
    await columnOrderedList!.init(initialColumnOrder);
    setColumnOrder(initialColumnOrder);
  };

  const getRows = () => {
    return rowOrder!.map(itemId => {
      const item = items.find(item => item.id === itemId);
      if (item) {
        return { id: item.id, ...item.model.toObject() };
      }
      return null;
    }).filter(Boolean);
  };

  if (!table || !rowOrderedList) {
    return null;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 0.1fr',
      height: 'calc(100vh - 16px)'
    }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <DraggableTable
          id={table.id}
          columns={columns}
          columnOrder={columnOrder}
          rows={getRows()}
        />
      </DragDropContext>
      <ResetButton onReset={handleReset} />
    </div>
  );
};

export const Table = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <TableStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};
