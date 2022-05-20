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
import { DragAndDropDebugPanel } from './helpers';

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
  previousOrder?: {[key: string]: string}
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
    const previousOrder = list.list.model.get('order');

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
      previousOrder,
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 0.1fr'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <DroppableList list={getList()} />
        </DragDropContext>
      </div>
      <DragAndDropDebugPanel
        previousOrder={list.previousOrder ?? {}}
        order={list.list.model.get('order')}
      />
      <div>
        <button onClick={handleReset}>Reset</button>
      </div>
    </div>
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
    <div style={{
      display: 'flex',
      justifyContent: 'space-around'
    }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        {lists.map(list => (
          <div key={list.id}>
            <DroppableList list={getList(list.id)} />
            <DragAndDropDebugPanel
              order={list.list.model.get('order')}
            />
          </div>
        ))}
      </DragDropContext>
      <div>
        <button onClick={handleReset}>Reset</button>
      </div>
    </div>
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
const TableStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [table] = useSelection(party?.select()
    .filter({ type: TYPE_TABLE_TABLE }),
  []) ?? [];
  const [orderedList, setOrderedList] = useState<OrderedList>();
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);

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
    const newOrderedList = new OrderedList(tableItem.model);
    await newOrderedList.init(createdItems.map(item => item.id));
    setCurrentOrder(createdItems.map(item => item.id));

    setParty(newParty);
    setOrderedList(newOrderedList);
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId, source } = result;
    if (
      !orderedList ||
      !destination ||
      destination.droppableId !== source.droppableId ||
      destination.index === source.index
    ) {
      return;
    }

    const currentOrderWithoutId = orderedList.values.filter(value => value !== draggableId);
    const newOrder = [
      ...currentOrderWithoutId.slice(0, destination.index),
      draggableId,
      ...currentOrderWithoutId.slice(destination.index, orderedList.values.length)
    ];
    await orderedList.init(newOrder);
    setCurrentOrder(newOrder);
  };

  const getRows = () => currentOrder.map(itemId => {
    const item = items.find(item => item.id === itemId);
    if (item) {
      return { id: item.id, ...item.model.toObject() };
    }
    return null;
  }).filter(Boolean);

  if (!table) {
    return null;
  }

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

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <DraggableTable
          id={table.id}
          columns={columns}
          rows={getRows()}
        />
      </DragDropContext>
      <DragAndDropDebugPanel
        order={table.model.get('order')}
      />
    </>
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

type TableStruct = {
  id: string
  table: Item<ObjectModel>
  orderedList?: OrderedList
  currentOrder?: string[]
}

const MultipleTableStory = () => {
  const nTables = 2;
  const nItems = 40;
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [tables, setTables] = useState<TableStruct[]>([]);

  const items = useSelection(party?.select()
    .filter({ type: TYPE_TEST_PERSON }),
  []) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    const tableItems = await Promise.all(Array.from({ length: nTables }).map(async (_, i) => await newParty.database.createItem({
      model: ObjectModel,
      type: TYPE_TABLE_TABLE,
      props: {
        title: 'Table ' + i
      }
    })));

    const createdItems = await Promise.all(Array.from({ length: nItems }).map(async () => await newParty?.database.createItem({
      type: TYPE_TEST_PERSON,
      props: {
        title: faker.name.firstName(),
        country: faker.address.country(),
        role: faker.name.jobTitle(),
        email: faker.internet.email()
      }
    })));

    const itemsPerTable = Math.ceil(nItems / nTables);
    const orderedLists = await Promise.all(tableItems.map(async (tableItem, i) => {
      const newOrderedList = new OrderedList(tableItem.model);
      await newOrderedList.init(createdItems.slice(i * itemsPerTable, i * itemsPerTable + itemsPerTable).map(item => item.id));
      return newOrderedList;
    }));

    setParty(newParty);
    setTables(tableItems.map(tableItem => {
      const orderedList = orderedLists.find(orderedList => orderedList.id === tableItem.id);
      return {
        id: tableItem.id,
        table: tableItem,
        orderedList: orderedList,
        currentOrder: orderedList?.values ?? []
      };
    }));

  }, []);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId, source } = result;
    if (
      !tables ||
      !destination ||
      destination.index === source.index
    ) {
      return;
    }

    const targetTable = tables.find(table => table.id === destination.droppableId);
    if (!targetTable?.orderedList) {
      return;
    }

    let newSourceOrder: string[];
    const sourceTable = tables.find(table => table.id === source.droppableId);
    if (destination.droppableId !== source.droppableId) {
      // Remove item from source
      if (sourceTable?.orderedList) {
        const sourceOrderWithoutId = sourceTable.orderedList.values.filter(value => value !== draggableId);
        await sourceTable.orderedList.init(sourceOrderWithoutId);
        newSourceOrder = sourceOrderWithoutId;
      }
    }

    const currentOrderWithoutId = targetTable.orderedList.values.filter(value => value !== draggableId);
    const newOrder = [
      ...currentOrderWithoutId.slice(0, destination.index),
      draggableId,
      ...currentOrderWithoutId.slice(destination.index, targetTable.orderedList.values.length)
    ];
    await targetTable.orderedList.init(newOrder);
    setTables(prev => prev.map(table => {
      if (table.id === targetTable.id) {
        return {
          ...targetTable,
          currentOrder: newOrder
        };
      }

      if (sourceTable && newSourceOrder && table.id === sourceTable.id) {
        return {
          ...sourceTable,
          currentOrder: newSourceOrder
        };
      }

      return table;
    }));
  };

  const getRows = (tableId: string) => {
    const table = tables.find(table => table.id === tableId);
    if (!table) {
      return [];
    }

    return table.currentOrder?.map(itemId => {
      const item = items.find(item => item.id === itemId);
      if (item) {
        return { id: item.id, ...item.model.toObject() };
      }
      return null;
    }).filter(Boolean) ?? [];
  };

  if (!tables.length) {
    return null;
  }

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

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '50% 50%'
        }}>
          {tables.map(table => (
            <div key={table.id}>
              <DraggableTable
                id={table.id}
                columns={columns}
                rows={getRows(table.id)}
              />
            </div>
          ))}
        </div>
      </DragDropContext>
    </>
  );
};

export const MultipleTable = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <MultipleTableStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};
