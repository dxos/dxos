//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';

import { Item, Party } from '@dxos/client';
import { DefaultSchemaDefs, TestType } from '@dxos/client-testing';
import { truncateKey } from '@dxos/debug';
import { Schema } from '@dxos/echo-db';
import { ObjectModel, OrderedList } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient, useSelection } from '@dxos/react-client';

import { DraggableKanban, DraggableTable, KanbanList, ProfileInitializer, useSchemaBuilder } from '../src';
import { DragAndDropDebugPanel } from './helpers';

export default {
  title: 'react-client-testing/DragAndDrop'
};

const TYPE_LIST = 'example:type/list';
const TYPE_TABLE_TABLE = 'dxos:type/table/table';

const ListStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [schema, setSchema] = useState<Schema>();
  const [list, setList] = useState<Item<ObjectModel>>();
  const builder = useSchemaBuilder(party);
  const [orderedList, setOrderedList] = useState<OrderedList>();
  const [previousOrder, setPreviousOrder] = useState<{[id: string]: string} | undefined>();
  const items = useSelection(party?.select()
    // TODO(kaplanski): Check SelectionAPI filter predicate change from undefined.
    .filter({ type: schema ? schema.name : ' ' }),
  [schema]) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    setParty(newParty);
  }, []);

  useAsyncEffect(async () => {
    if (builder) {
      const generatedSchemas = await builder.createSchemas();
      const personSchema = generatedSchemas.find(schema => schema.name === DefaultSchemaDefs[TestType.Person].schema);
      const listItem = await party?.database.createItem({
        model: ObjectModel,
        type: TYPE_LIST,
        props: {
          schema: personSchema!.name
        }
      });

      const data = await builder.createData(undefined, {
        [DefaultSchemaDefs[TestType.Org].schema]: 3,
        [DefaultSchemaDefs[TestType.Person].schema]: 10
      });
      const personItems = data[1];

      const newOrderedList = new OrderedList(listItem!.model);
      await newOrderedList.init(personItems.map(item => item.id));
      setOrderedList(newOrderedList);
      setSchema(personSchema);
      setList(listItem);
    }
  }, [builder]);

  const getList = () => ({
    id: 'example-people-list',
    title: 'People',
    width: '100%',
    children: orderedList?.values.map(id => {
      const item = items.find(item => item.id === id);
      return {
        id,
        title: truncateKey(id, 5) + ' - ' + item?.model.get('title')
      };
    })
  });

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
    setPreviousOrder(list!.model.get('order'));

    const id = draggableId.split('-')[1];

    const orderWithoutId = orderedList.values.filter(el => el !== id);
    const newOrder = [
      ...orderWithoutId.slice(0, destination.index),
      id,
      ...orderWithoutId.slice(destination.index, orderedList.values.length)
    ];
    await orderedList.init(newOrder);
  };

  if (!list) {
    return null;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '30% 70%'
    }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <DraggableKanban lists={[getList()]} />
      </DragDropContext>
      <DragAndDropDebugPanel
        previousOrder={previousOrder}
        order={list.model.get('order')}
        party={party}
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

const TYPE_KANBAN_BOARD = 'dxos:type/kanban/board';
const TYPE_KANBAN_COLUMN = 'dxos:type/kanban/column';
const useSchema = (party?: Party, schema?: Schema, targetFieldKey?: string) => {
  const items = useSelection(
    party?.select()
      .filter({ type: schema?.name }),
    [schema]
  ) ?? [];

  const getListChildren = (items: Item<ObjectModel>[], value: string) => items
    .filter(row => row.model.get(targetFieldKey!) === value)
    .map(item => ({ id: item.id, ...item.model.toObject() }));

  // Gets all unique values of target field for the items using the schema from this context.
  const uniqueRowValues = targetFieldKey ? new Set(items.map(row => row.model.get(targetFieldKey))) : new Set();
  const lists: KanbanList[] = Array.from(uniqueRowValues.values()).map(listValue => {
    if (!party || !schema || !targetFieldKey) {
      return {};
    }

    let title = listValue;
    if (schema.getField(targetFieldKey)?.ref) {
      const item = party.select({ id: listValue }).exec().entities[0];
      if (item) {
        // TODO(kaplanski): Now getting first field. Should we have a default schema field? Or pass it by param
        title = Object.values(item.model.toObject())[0];
      }
    }

    return {
      id: listValue,
      title,
      children: getListChildren(items, listValue)
    };
  });

  useAsyncEffect(async () => {
    if (!party || !schema || !targetFieldKey) {
      return;
    }
    Array.from(uniqueRowValues.values()).forEach(async (value) => {
      const [listColumnItem] = party.select().filter(item => item.model.get('value') === value).exec().entities;
      if (!listColumnItem) {
        await party.database.createItem({
          model: ObjectModel,
          type: TYPE_KANBAN_COLUMN,
          props: {
            value
          }
        });
      }
    });
  }, [lists.map(list => list.id)]);

  return lists;
};

const KanbanStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [schema, setSchema] = useState<Schema>();
  const builder = useSchemaBuilder(party);
  const targetFieldKey = schema?.fields[1].key;
  const lists = useSchema(party, schema, targetFieldKey);

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    setParty(newParty);
  }, []);

  useAsyncEffect(async () => {
    if (builder) {
      const generatedSchemas = await builder.createSchemas();
      const personSchema = generatedSchemas.find(schema => schema.name === DefaultSchemaDefs[TestType.Person].schema);
      await builder.createData(undefined, {
        [DefaultSchemaDefs[TestType.Org].schema]: 3,
        [DefaultSchemaDefs[TestType.Person].schema]: 40
      });
      setSchema(personSchema);
    }
  }, [builder]);

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) {
      return;
    }
    const id = draggableId.split('-')[1];
    const item = party?.select({ id }).exec().entities[0];
    if (item) {
      await item.model.set(targetFieldKey, destination.droppableId);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <DraggableKanban lists={lists} />
    </DragDropContext>
  );
};

export const Kanban = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <KanbanStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};

