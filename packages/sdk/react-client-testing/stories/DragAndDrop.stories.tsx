//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';

import { Item, Party } from '@dxos/client';
import { DefaultSchemaDefs, TestType } from '@dxos/client-testing';
import { Schema } from '@dxos/echo-db';
import { ObjectModel, OrderedList } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient, useSelection } from '@dxos/react-client';

import { DraggableTable, DroppableList, Card, List as ListDef, ProfileInitializer, useSchemaBuilder } from '../src';
import { DragAndDropDebugPanel } from './helpers';

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
  // TODO(kaplanski): Check how ordered lists work. To trigger a rerender, we need a useState.
  const [previousOrder, setPreviousOrder] = useState<{[key: string]: string}>();
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const items = useSelection(party?.select()
    .filter({ type: TYPE_LIST_ITEM })
    .filter({ parent: list?.id }),
  [list, orderedList?.values]) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    const listItem = await newParty.database.createItem({
      model: ObjectModel,
      type: TYPE_LIST
    });

    const res = await Promise.all(Array.from({ length: faker.datatype.number({ min: 5, max: 10 }) }).map(async (_, i) => {
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

    setParty(newParty);
    setList(listItem);
    setOrderedList(newOrderedList);
    setCurrentOrder(newOrderedList.values);
  }, []);

  const getList = (): ListDef => ({
    id: 'test-list',
    title: 'People',
    children: currentOrder.map(itemId => {
      const item = items.find(item => item.id === itemId);
      if (item) {
        return { id: item.id, title: item.model.get('title') };
      }
      return null;
    }).filter(Boolean) as Card[]
  });

  const handleDragEnd = async (result: DropResult) => {
    if (!orderedList || !result.destination) {
      return;
    }
    setPreviousOrder(list?.model.get('order'));

    const { destination, draggableId } = result;
    const currentOrderWithoutId = orderedList.values.filter(value => value !== draggableId);
    const newOrder = [
      ...currentOrderWithoutId.slice(0, destination.index),
      draggableId,
      ...currentOrderWithoutId.slice(destination.index, orderedList?.values.length)
    ];
    await orderedList.init(newOrder);
    setCurrentOrder(newOrder);
  };

  if (!orderedList) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-around'
    }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <DroppableList list={getList()} />
      </DragDropContext>
      <DragAndDropDebugPanel
        previousOrder={previousOrder}
        order={list?.model.get('order')}
      />
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

type ListStruct = {
  id: string
  list: Item<ObjectModel>
  orderedList: OrderedList | undefined
  previousOrder?: string[]
  currentOrder: string[]
}

const MultipleListStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [lists, setLists] = useState<ListStruct[]>([]);

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
      const items = await Promise.all(Array.from({ length: faker.datatype.number({ min: 4, max: 20 }) }).map(async (_, i) => {
        return await newParty?.database.createItem({
          model: ObjectModel,
          type: TYPE_LIST_ITEM,
          props: {
            title: faker.name.firstName()
          }
        });
      }));
      const newOrderedList = new OrderedList(listItem.model);
      await newOrderedList.init(items.map(item => item.id));
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
        const [item] = party!.select({ id: itemId }).exec().entities ?? [];
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
const TableStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [schema, setSchema] = useState<Schema>();
  const builder = useSchemaBuilder(party);
  const [table] = useSelection(party?.select()
    .filter({ type: TYPE_TABLE_TABLE }),
  []) ?? [];
  const [orderedList, setOrderedList] = useState<OrderedList>();
  const [previousOrder, setPreviousOrder] = useState<{[id: string]: string} | undefined>();

  const items = useSelection(party?.select()
    .filter({ type: schema?.name }),
  [schema]) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    setParty(newParty);
  }, []);

  useAsyncEffect(async () => {
    if (builder) {
      const generatedSchemas = await builder.createSchemas();
      const personSchema = generatedSchemas.find(schema => schema.name === DefaultSchemaDefs[TestType.Person].schema);
      const tableItem = await party?.database.createItem({
        model: ObjectModel,
        type: TYPE_TABLE_TABLE,
        props: {
          schema: personSchema!.name
        }
      });

      const data = await builder.createData(undefined, {
        [DefaultSchemaDefs[TestType.Org].schema]: 3,
        [DefaultSchemaDefs[TestType.Person].schema]: 10
      });
      const personItems = data[1];

      const newOrderedList = new OrderedList(tableItem!.model);
      await newOrderedList.init(personItems.map(item => item.id));
      setOrderedList(newOrderedList);

      setSchema(personSchema);
    }
  }, [builder]);

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
    setPreviousOrder(table.model.get('order'));

    const id = draggableId.split('-')[1];

    const currentValueInIndex = orderedList.values[destination.index];
    if (source.index < destination.index) {
      // await orderedList.remove([id]);
      await orderedList.insert(currentValueInIndex, id);
    } else {
      // await orderedList.remove([currentValueInIndex]);
      await orderedList.insert(id, currentValueInIndex);
    }
  };

  const getRows = () => {
    if (!table || !orderedList) {
      return [];
    }

    const tableRowIds = orderedList.values;

    if (!tableRowIds) {
      return [];
    }

    const rows = items.filter(item => tableRowIds.includes(item.id));
    return rows.map(item => ({
      id: item.id,
      ...item.model.toObject()
    })).sort((a: any, b: any) => {
      if (!tableRowIds) {
        return 0;
      }
      if (tableRowIds.indexOf(a.id) > tableRowIds.indexOf(b.id)) {
        return 1;
      } else {
        return -1;
      }
    });
  };

  if (!schema || !table) {
    return null;
  }

  const columns = [
    {
      id: 'id',
      accessor: 'id',
      title: 'ID'
    },
    ...schema.fields.map(field => ({
      id: field.key,
      accessor: field.key,
      title: field.key
    }))
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
        previousOrder={previousOrder}
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
const MultipleTableStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [schema, setSchema] = useState<Schema>();
  const builder = useSchemaBuilder(party);
  const tableItems = useSelection(party?.select()
    .filter({ type: TYPE_TABLE_TABLE }),
  []) ?? [];
  const [orderedLists, setOrderedLists] = useState<OrderedList[]>([]);

  const items = useSelection(party?.select()
    .filter({ type: schema?.name }),
  []) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    setParty(newParty);
  }, []);

  useAsyncEffect(async () => {
    if (builder) {
      const generatedSchemas = await builder.createSchemas();
      const personSchema = generatedSchemas.find(schema => schema.name === DefaultSchemaDefs[TestType.Person].schema);
      const table1 = await party?.database.createItem({
        model: ObjectModel,
        type: TYPE_TABLE_TABLE,
        props: {
          schema: personSchema!.name,
          positions: []
        }
      });
      const table2 = await party?.database.createItem({
        model: ObjectModel,
        type: TYPE_TABLE_TABLE,
        props: {
          schema: personSchema!.name,
          positions: []
        }
      });

      const data = await builder.createData(undefined, {
        [DefaultSchemaDefs[TestType.Org].schema]: 3,
        [DefaultSchemaDefs[TestType.Person].schema]: 10
      });
      const personItems = data[1];
      // Separate data into two tables
      const personItems1 = personItems.slice(0, personItems.length / 2);
      const personItems2 = personItems.slice(personItems.length / 2, personItems.length);
      await table1?.model.set('order', Object.assign({}, ...personItems1.map((item, i) =>
        ({ [item.id]: personItems1[i + 1]?.id })).slice(0, personItems1.length - 1)));
      await table2?.model.set('order', Object.assign({}, ...personItems2.map((item, i) =>
        ({ [item.id]: personItems2[i + 1]?.id })).slice(0, personItems2.length - 1)));

      const newOrderedLists = [table1, table2].map(table => new OrderedList(table!.model, 'order'));
      setOrderedLists(newOrderedLists);

      setSchema(personSchema);
    }
  }, [builder]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId, source } = result;
    console.log(result);
    if (!destination) {
      return;
    }

    const id = draggableId.split('-')[1];
    const targetTable = tableItems.find(table => table.id === destination.droppableId);
    if (!targetTable) {
      console.log('Target table not found');
      return;
    }

    // If moving to another table, remove from source table
    if (targetTable.id !== source.droppableId) {
      console.log('Different target table');
      const sourceList = orderedLists.find(list => list.id === source.droppableId);
      await sourceList?.remove([id]);
    }

    const list = orderedLists.find(list => list.id === targetTable.id);
    if (!list) {
      console.log('List not found');
      return;
    }
    const currentValueInIndex = list.values[destination.index];
    // const before = [...list.values];
    if (destination.index > source.index) {
      await list.insert(currentValueInIndex, id);
    } else {
      await list.insert(id, currentValueInIndex);
    }
    // const after = [...list.values];
    // console.table(Array.from({ length: before.length }).map((_, i) => ({ before: before[i], after: after[i] })));
  };

  const getRows = (tableId: string) => {
    const table = tableItems.find(item => item.id === tableId);
    if (!table) {
      return [];
    }

    const tableRowIds = orderedLists.find(list => list.id === table.id)?.values;

    if (!tableRowIds) {
      return [];
    }

    const rows = items.filter(item => tableRowIds.includes(item.id));
    return rows.map(item => ({
      id: item.id,
      ...item.model.toObject()
    })).sort((a: any, b: any) => {
      if (!tableRowIds) {
        return 0;
      }
      if (tableRowIds.indexOf(a.id) > tableRowIds.indexOf(b.id)) {
        return 1;
      } else {
        return -1;
      }
    });
  };

  if (!schema || !tableItems.length) {
    return null;
  }

  const columns = [
    {
      id: 'id',
      accessor: 'id',
      title: 'ID'
    },
    ...schema.fields.map(field => ({
      id: field.key,
      accessor: field.key,
      title: field.key
    }))
  ];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        height: 'calc(100vh - 8px)'
      }}>
        <DraggableTable
          id={tableItems[0].id}
          columns={columns}
          rows={getRows(tableItems[0].id)}
          />
        <DraggableTable
          id={tableItems[1].id}
          columns={columns}
          rows={getRows(tableItems[1].id)}
        />
      </div>
    </DragDropContext>
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
