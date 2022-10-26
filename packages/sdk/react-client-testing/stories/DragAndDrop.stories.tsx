//
// Copyright 2022 DXOS.org
//

import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import faker from 'faker';
import React, { useState } from 'react';

import { Item, Party, ObjectModel, OrderedList } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient, useSelection } from '@dxos/react-client';

import { ProfileInitializer } from '../src';
import {
  ColumnContainer,
  DragAndDropDebugPanel,
  DroppableList,
  DroppableTable,
  ListItem,
  ListItemDef,
  ResetButton,
  StorybookContainer,
  moveItemInArray,
  updateSourceAndTargetState
} from './helpers';

export default {
  title: 'react-client-testing/DragAndDrop'
};

const TYPE_LIST = 'example:type/list';
const TYPE_LIST_ITEM = 'example:type/list/item';
const TYPE_TABLE_TABLE = 'dxos:type/table/table';

const items = Array.from({
  length: faker.datatype.number({ min: 1, max: 10 })
}).map(() => ({
  id: faker.datatype.uuid(),
  title: faker.name.firstName()
}));
const initialOrder = items.map((item) => item.id);

export const NonEchoList = () => {
  const [activeId, setActiveId] = useState<string>();
  const [order, setOrder] = useState(items.map((item) => item.id));

  const handleDragEnd = async ({ over }: DragEndEvent) => {
    if (!activeId) {
      return;
    }
    if (over) {
      const overIndex = order.indexOf(over.id as string);
      const activeIndex = order.indexOf(activeId);
      if (activeIndex !== overIndex) {
        const newOrder = moveItemInArray(order, activeId, overIndex);
        setOrder(newOrder);
      }
    }
    setActiveId(undefined);
  };

  return (
    <StorybookContainer
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr'
      }}
    >
      <DndContext
        modifiers={[restrictToVerticalAxis]}
        onDragStart={({ active }) => {
          if (!active) {
            return;
          }

          setActiveId(active.id as string);
        }}
        onDragEnd={handleDragEnd}
      >
        <DroppableList
          id='test-list'
          items={
            order.map((id) => items.find((item) => item.id === id)).filter(Boolean) as { id: string; title: string }[]
          }
          style={{ width: 'calc(100% - 16px)' }}
        />
      </DndContext>
      <div>
        <ResetButton onReset={() => setOrder(initialOrder)} />
        <DragAndDropDebugPanel order={Object.assign({}, ...order.map((id, i) => ({ [id]: order[i + 1] ?? '' })))} />
      </div>
    </StorybookContainer>
  );
};

const ListStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [list, setList] = useState<Item<ObjectModel>>();
  const [orderedList, setOrderedList] = useState<OrderedList>();
  const [initialOrder, setInitialOrder] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const items = useSelection(party?.select().filter({ type: TYPE_LIST_ITEM }), [list]) ?? [];
  const [activeId, setActiveId] = useState<string>();

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    const listItem = await newParty.database.createItem({
      model: ObjectModel,
      type: TYPE_LIST
    });

    const res = await Promise.all(
      Array.from({ length: faker.datatype.number({ min: 10, max: 30 }) }).map(
        async () =>
          await newParty?.database.createItem({
            model: ObjectModel,
            type: TYPE_LIST_ITEM,
            props: {
              title: faker.name.firstName()
            }
          })
      )
    );

    const newOrderedList = new OrderedList(listItem.model);
    await newOrderedList.init(res.map((item) => item.id));
    setOrderedList(newOrderedList);
    setInitialOrder(newOrderedList.values);
    setCurrentOrder(newOrderedList.values);

    setList(listItem);
    setParty(newParty);

    return () => {
      orderedList?.destroy();
    };
  }, []);

  // TODO(kaplanski): Replace currentOrder with orderedList.values triggering re-render.
  const getListItems = () =>
    currentOrder
      .map((itemId) => {
        const item = items.find((item) => item.id === itemId);
        if (item) {
          return { id: item.id, title: item.model.get('title') };
        }
        return null;
      })
      .filter(Boolean) as ListItemDef[];

  const handleDragEnd = async ({ over }: DragEndEvent) => {
    if (!orderedList || !activeId) {
      return;
    }
    if (over) {
      const overIndex = orderedList.values.indexOf(over.id as string);
      const activeIndex = orderedList.values.indexOf(activeId);
      if (activeIndex !== overIndex) {
        const newOrder = moveItemInArray(orderedList.values, activeId, overIndex);
        setCurrentOrder(newOrder);
        await orderedList.init(newOrder);
      }
    }
    setActiveId(undefined);
  };

  const handleReset = async () => {
    if (!orderedList) {
      return;
    }
    setCurrentOrder(initialOrder);
    await orderedList.init(initialOrder);
  };

  if (!list) {
    return null;
  }

  return (
    <StorybookContainer
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr'
      }}
    >
      <DndContext
        modifiers={[restrictToVerticalAxis]}
        onDragStart={({ active }) => {
          if (!active) {
            return;
          }

          setActiveId(active.id as string);
        }}
        onDragEnd={handleDragEnd}
      >
        <DroppableList id='test-list' items={getListItems()} style={{ width: 'calc(100% - 16px)' }} />
      </DndContext>
      <div>
        <ResetButton onReset={handleReset} />
        <DragAndDropDebugPanel order={list.model.get('order')} />
      </div>
    </StorybookContainer>
  );
};

export const List = () => (
  <ClientProvider>
    <ProfileInitializer>
      <ListStory />
    </ProfileInitializer>
  </ClientProvider>
);

const MultipleListStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [lists, setLists] = useState<Item<ObjectModel>[]>([]);
  const [orderedLists, setOrderedLists] = useState<OrderedList[]>();
  const [initialOrders, setInitialOrders] = useState<{ id: string; values: string[] }[]>([]);
  const [currentOrders, setCurrentOrders] = useState<{ id: string; values: string[] }[]>([]);
  const items = useSelection(party?.select().filter({ type: TYPE_LIST_ITEM }), []) ?? [];
  const [activeId, setActiveId] = useState<string>();

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();

    const listItems = await Promise.all(
      Array.from({ length: 3 }).map(
        async () =>
          await newParty.database.createItem({
            model: ObjectModel,
            type: TYPE_LIST
          })
      )
    );

    const newOrderedLists: OrderedList[] = [];
    await Promise.all(
      listItems.map(async (listItem) => {
        const createdItems = await Promise.all(
          Array.from({
            length: faker.datatype.number({ min: 4, max: 20 })
          }).map(
            async () =>
              await newParty?.database.createItem({
                model: ObjectModel,
                type: TYPE_LIST_ITEM,
                props: {
                  title: faker.name.firstName()
                }
              })
          )
        );
        const newOrderedList = new OrderedList(listItem.model);
        await newOrderedList.init(createdItems.map((item) => item.id));
        newOrderedLists.push(newOrderedList);
      })
    );

    setParty(newParty);
    setLists(listItems);
    setOrderedLists(newOrderedLists);
    setCurrentOrders(
      newOrderedLists.map((orderedList) => ({
        id: orderedList.id,
        values: orderedList.values
      }))
    );
    setInitialOrders(
      newOrderedLists.map((orderedList) => ({
        id: orderedList.id,
        values: orderedList.values
      }))
    );

    return () => {
      orderedLists?.forEach((orderedList) => orderedList.destroy());
    };
  }, []);

  const getListItems = (listId: string) => {
    // TODO(kaplanski): Replace currentOrder with orderedList.values triggering re-render.
    const currentOrder = currentOrders?.find((list) => list.id === listId);
    if (!currentOrder) {
      return [];
    }

    return currentOrder.values
      .map((itemId) => {
        const item = items.find((item) => item.id === itemId);
        if (item) {
          return { id: item.id, title: item.model.get('title') };
        }
        return null;
      })
      .filter(Boolean) as ListItemDef[];
  };

  const handleDragEnd = async ({ over }: DragEndEvent) => {
    if (!orderedLists?.length || !activeId || !over?.data.current) {
      return;
    }

    const sourceOrderedList = orderedLists.find((list) => list.values.includes(activeId));
    const targetOrderedList = orderedLists.find((list) => list.id === over.data.current!.sortable.containerId);
    if (!sourceOrderedList || !targetOrderedList) {
      return;
    }

    let newSourceOrder: string[] | undefined;
    if (sourceOrderedList.id !== targetOrderedList.id) {
      // Remove item from source
      const sourceOrderWithoutId = sourceOrderedList.values.filter((value) => value !== activeId);
      await sourceOrderedList.init(sourceOrderWithoutId);
      newSourceOrder = sourceOrderWithoutId;
    }

    const overIndex = targetOrderedList.values.indexOf(over.id as string);
    const activeIndex = targetOrderedList.values.indexOf(activeId);
    if (activeIndex === overIndex) {
      return;
    }

    const newOrder = moveItemInArray(targetOrderedList.values, activeId, overIndex);
    targetOrderedList.id !== sourceOrderedList.id
      ? updateSourceAndTargetState(setCurrentOrders, targetOrderedList, newOrder, sourceOrderedList, newSourceOrder)
      : updateSourceAndTargetState(setCurrentOrders, targetOrderedList, newOrder);
    await targetOrderedList.init(newOrder);

    setActiveId(undefined);
  };

  const handleReset = async () => {
    if (!initialOrders || !orderedLists) {
      return;
    }

    // Update state to trigger rerender
    setCurrentOrders(
      orderedLists.map((orderedList) => {
        const initialOrder = initialOrders.find((order) => order.id === orderedList.id);
        if (!initialOrder) {
          return orderedList;
        }
        return initialOrder;
      })
    );

    await Promise.all(
      orderedLists.map(async (orderedList) => {
        const initialOrder = initialOrders.find((order) => order.id === orderedList.id);
        initialOrder && (await orderedList?.init(initialOrder.values));
      })
    );
  };

  if (!party || !lists.length) {
    return null;
  }

  const renderDragOverlay = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (!item) {
      return null;
    }
    return (
      <ListItem
        item={{
          id: item.id,
          title: item.model.get('title')
        }}
        style={{
          backgroundColor: 'white',
          boxShadow: 'box-shadow: 10px 10px 30px -7px rgba(0,0,0,0.3)',
          width: 'fit-content',
          padding: 8
        }}
      />
    );
  };

  return (
    <StorybookContainer
      style={{
        display: 'grid',
        gridTemplateColumns: [...lists.map(() => '1fr'), '0.1fr'].join(' '),
        columnGap: 8
      }}
    >
      <DndContext
        onDragStart={({ active }) => {
          if (!active) {
            return;
          }

          setActiveId(active.id as string);
        }}
        onDragEnd={handleDragEnd}
        onDragOver={({ active, over }) => {
          const overId = over?.id;

          if (overId == null) {
            return;
          }

          const overContainer = currentOrders.find((currentOrder) => currentOrder.values.includes(overId as string));
          const activeContainer = currentOrders.find((currentOrder) =>
            currentOrder.values.includes(active.id as string)
          );

          if (!overContainer || !activeContainer) {
            return;
          }

          if (activeContainer.id !== overContainer.id) {
            setCurrentOrders((prev) => {
              const overItems = overContainer.values;
              const overIndex = overItems.indexOf(overId as string);

              const newIndex = overIndex >= 0 ? overIndex : overItems.length + 1;

              return prev.map((currentOrder) => {
                if (currentOrder.id === activeContainer.id) {
                  return {
                    id: currentOrder.id,
                    values: currentOrder.values.filter((itemId) => itemId !== active.id)
                  };
                }
                if (currentOrder.id === overContainer.id) {
                  return {
                    id: currentOrder.id,
                    values: [
                      ...currentOrder.values.slice(0, newIndex),
                      active.id as string,
                      ...currentOrder.values.slice(newIndex, currentOrder.values.length)
                    ]
                  };
                }
                return currentOrder;
              });
            });
          }
        }}
      >
        {lists.map((list) => (
          <ColumnContainer
            key={list.id}
            topComponent={
              <DroppableList id={list.id} items={getListItems(list.id)} activeId={activeId} style={{ width: '100%' }} />
            }
            bottomComponent={<DragAndDropDebugPanel order={list.model.get('order')} />}
            config={{
              fixedComponent: 'bottom',
              height: '300px'
            }}
          />
        ))}
        <DragOverlay>{activeId && renderDragOverlay(activeId)}</DragOverlay>
      </DndContext>
      <ResetButton onReset={handleReset} />
    </StorybookContainer>
  );
};

export const MultipleList = () => (
  <ClientProvider>
    <ProfileInitializer>
      <MultipleListStory />
    </ProfileInitializer>
  </ClientProvider>
);

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
  const [activeId, setActiveId] = useState<string>();

  const items = useSelection(party?.select().filter({ type: TYPE_TEST_PERSON }), []) ?? [];

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();
    const tableItem = await newParty.database.createItem({
      model: ObjectModel,
      type: TYPE_TABLE_TABLE
    });

    const createdItems = await Promise.all(
      Array.from({ length: 40 }).map(
        async () =>
          await newParty?.database.createItem({
            type: TYPE_TEST_PERSON,
            props: {
              title: faker.name.firstName(),
              country: faker.address.country(),
              role: faker.name.jobTitle(),
              email: faker.internet.email()
            }
          })
      )
    );
    const newRowOrderedList = new OrderedList(tableItem.model, 'rowOrder');
    await newRowOrderedList.init(createdItems.map((item) => item.id));
    const newColumnOrderedList = new OrderedList(tableItem.model, 'columnOrder');
    await newColumnOrderedList.init(columns.map((column) => column.accessor));

    setParty(newParty);
    setTable(tableItem);
    setRowOrderedList(newRowOrderedList);
    setRowOrder(newRowOrderedList.values);
    setColumnOrderedList(newColumnOrderedList);
    setColumnOrder(newColumnOrderedList.values);
    setInitialRowOrder(newRowOrderedList.values);
    setInitialColumnOrder(newColumnOrderedList.values);

    return () => {
      rowOrderedList?.destroy();
      columnOrderedList?.destroy();
    };
  }, []);

  const handleDragEnd = async ({ over }: DragEndEvent) => {
    if (!activeId) {
      return;
    }

    if (over) {
      if (over.data.current?.sortable.containerId.split('-')[0] === 'columns') {
        if (columnOrderedList) {
          const overIndex = columnOrderedList.values.indexOf(over.id as string);
          const activeIndex = columnOrderedList.values.indexOf(activeId);
          if (activeIndex !== overIndex) {
            const newOrder = moveItemInArray(columnOrderedList.values, activeId, overIndex);
            setColumnOrder(newOrder);
            await columnOrderedList.init(newOrder);
          }
        }
      } else {
        if (rowOrderedList) {
          const overIndex = rowOrderedList.values.indexOf(over.id as string);
          const activeIndex = rowOrderedList.values.indexOf(activeId);
          if (activeIndex !== overIndex) {
            const newOrder = moveItemInArray(rowOrderedList.values, activeId, overIndex);
            setRowOrder(newOrder);
            await rowOrderedList.init(newOrder);
          }
        }
      }
    }
    setActiveId(undefined);
  };

  const handleReset = async () => {
    setRowOrder(initialRowOrder);
    await rowOrderedList!.init(initialRowOrder);
    setColumnOrder(initialColumnOrder);
    await columnOrderedList!.init(initialColumnOrder);
  };

  const getRows = () =>
    rowOrder!
      .map((itemId) => {
        const item = items.find((item) => item.id === itemId);
        if (item) {
          return { id: item.id, ...item.model.toObject() };
        }
        return null;
      })
      .filter(Boolean);

  if (!table || !rowOrderedList) {
    return null;
  }

  return (
    <StorybookContainer
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 0.1fr',
        columnGap: 8
      }}
    >
      <DndContext
        onDragStart={({ active }) => {
          if (!active) {
            return;
          }

          setActiveId(active.id as string);
        }}
        onDragEnd={handleDragEnd}
      >
        <DroppableTable id={table.id} columns={columns} columnOrder={columnOrder} rows={getRows()} />
      </DndContext>
      <ResetButton onReset={handleReset} />
    </StorybookContainer>
  );
};

export const Table = () => (
  <ClientProvider>
    <ProfileInitializer>
      <TableStory />
    </ProfileInitializer>
  </ClientProvider>
);

const MultipleContainersStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const [containers, setContainers] = useState<Item<ObjectModel>[]>([]);
  const [orderedLists, setOrderedLists] = useState<OrderedList[]>();
  const [initialOrders, setInitialOrders] = useState<{ id: string; values: string[] }[]>([]);
  const [currentOrders, setCurrentOrders] = useState<{ id: string; values: string[] }[]>([]);
  const [initialColumnOrder, setInitialColumnOrder] = useState<string[]>([]);
  const [columnOrderedList, setColumnOrderedList] = useState<OrderedList>();
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const items = useSelection(party?.select().filter({ type: TYPE_TEST_PERSON }), []) ?? [];
  const [activeId, setActiveId] = useState<string>();

  useAsyncEffect(async () => {
    const newParty = await client.echo.createParty();

    const listItem = await newParty.database.createItem({
      model: ObjectModel,
      type: TYPE_LIST
    });

    const tableItem = await newParty.database.createItem({
      model: ObjectModel,
      type: TYPE_TABLE_TABLE
    });

    const containerItems = [listItem, tableItem];

    const newOrderedLists: OrderedList[] = [];
    await Promise.all(
      containerItems.map(async (containerItem) => {
        const createdItems = await Promise.all(
          Array.from({
            length: faker.datatype.number({ min: 4, max: 20 })
          }).map(
            async () =>
              await newParty?.database.createItem({
                model: ObjectModel,
                type: TYPE_TEST_PERSON,
                props: {
                  title: faker.name.firstName(),
                  country: faker.address.country(),
                  role: faker.name.jobTitle(),
                  email: faker.internet.email()
                }
              })
          )
        );
        const newOrderedList = new OrderedList(containerItem.model);
        await newOrderedList.init(createdItems.map((item) => item.id));
        newOrderedLists.push(newOrderedList);
      })
    );

    const newColumnOrderedList = new OrderedList(tableItem.model, 'columnOrder');
    await newColumnOrderedList.init(columns.map((column) => column.accessor));

    setParty(newParty);
    setContainers(containerItems);
    setOrderedLists(newOrderedLists);
    setCurrentOrders(
      newOrderedLists.map((orderedList) => ({
        id: orderedList.id,
        values: orderedList.values
      }))
    );
    setInitialOrders(
      newOrderedLists.map((orderedList) => ({
        id: orderedList.id,
        values: orderedList.values
      }))
    );
    setColumnOrderedList(newColumnOrderedList);
    setColumnOrder(newColumnOrderedList.values);
    setInitialColumnOrder(newColumnOrderedList.values);

    return () => {
      orderedLists?.forEach((orderedList) => orderedList.destroy());
    };
  }, []);

  const getContainerItems = (containerId: string) => {
    // TODO(kaplanski): Replace currentOrder with orderedList.values triggering re-render.
    const currentOrder = currentOrders?.find((currentOrder) => currentOrder.id === containerId);
    if (!currentOrder) {
      return [];
    }

    return currentOrder.values
      .map((itemId) => {
        const item = items.find((item) => item.id === itemId);
        if (item) {
          return { id: item.id, ...item.model.toObject() };
        }
        return null;
      })
      .filter(Boolean) as ListItemDef[];
  };

  const handleColumnDrag = async (overId: string, activeId: string) => {
    const overIndex = columnOrderedList!.values.indexOf(overId);
    const activeIndex = columnOrderedList!.values.indexOf(activeId);
    if (activeIndex !== overIndex) {
      const newOrder = moveItemInArray(columnOrderedList!.values, activeId, overIndex);
      setColumnOrder(newOrder);
      await columnOrderedList!.init(newOrder);
    }
  };

  const handleDragEnd = async ({ over }: DragEndEvent) => {
    if (!orderedLists?.length || !activeId || !over?.data.current) {
      return;
    }

    if (over.data.current?.sortable.containerId.split('-')[0] === 'columns' && columnOrderedList) {
      await handleColumnDrag(over.id as string, activeId);
      return;
    }

    const sourceOrderedList = orderedLists.find((list) => list.values.includes(activeId));
    const targetOrderedList = orderedLists.find((list) => list.id === over.data.current!.sortable.containerId);
    if (!sourceOrderedList || !targetOrderedList) {
      return;
    }

    let newSourceOrder: string[] | undefined;
    // Check if dragging to a different list.
    if (sourceOrderedList.id !== targetOrderedList.id) {
      // Remove item from source list.
      const sourceOrderWithoutId = sourceOrderedList.values.filter((value) => value !== activeId);
      await sourceOrderedList.init(sourceOrderWithoutId);
      newSourceOrder = sourceOrderWithoutId;
    }

    const overIndex = targetOrderedList.values.indexOf(over.id as string);
    const activeIndex = targetOrderedList.values.indexOf(activeId);
    if (activeIndex === overIndex) {
      return;
    }

    const newOrder = moveItemInArray(targetOrderedList.values, activeId, overIndex);
    targetOrderedList.id !== sourceOrderedList.id
      ? updateSourceAndTargetState(setCurrentOrders, targetOrderedList, newOrder, sourceOrderedList, newSourceOrder)
      : updateSourceAndTargetState(setCurrentOrders, targetOrderedList, newOrder);
    await targetOrderedList.init(newOrder);

    setActiveId(undefined);
  };

  // TODO(kaplanski): Different types of DragOverlays.
  const renderDragOverlay = (id: string, type?: string) => {
    const item = items.find((item) => item.id === id);
    if (!item) {
      return null;
    }

    return (
      <ListItem
        item={{
          id: item.id,
          title: item.model.get('title')
        }}
        style={{
          cursor: 'grabbing',
          backgroundColor: 'white',
          boxShadow: 'box-shadow: 10px 10px 30px -7px rgba(0,0,0,0.3)',
          width: 'fit-content',
          padding: 8
        }}
      />
    );
  };

  const handleReset = async () => {
    if (!initialOrders || !orderedLists) {
      return;
    }

    // Update state to trigger rerender
    setCurrentOrders(
      orderedLists.map((orderedList) => {
        const initialOrder = initialOrders.find((order) => order.id === orderedList.id);
        if (!initialOrder) {
          return orderedList;
        }
        return initialOrder;
      })
    );
    setColumnOrder(initialColumnOrder);

    await Promise.all(
      orderedLists.map(async (orderedList) => {
        const initialOrder = initialOrders.find((order) => order.id === orderedList.id);
        initialOrder && (await orderedList?.init(initialOrder.values));
      })
    );

    await columnOrderedList!.init(initialColumnOrder);
  };

  return (
    <StorybookContainer
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 0.1fr',
        columnGap: 8
      }}
    >
      <DndContext
        onDragStart={({ active }) => {
          if (!active) {
            return;
          }

          setActiveId(active.id as string);
        }}
        onDragEnd={handleDragEnd}
        onDragOver={({ active, over }) => {
          const overId = over?.id;

          if (overId == null) {
            return;
          }

          const overContainer = currentOrders.find((currentOrder) => currentOrder.values.includes(overId as string));
          const activeContainer = currentOrders.find((currentOrder) =>
            currentOrder.values.includes(active.id as string)
          );

          if (!overContainer || !activeContainer) {
            return;
          }

          if (activeContainer.id !== overContainer.id) {
            setCurrentOrders((prev) => {
              const overItems = overContainer.values;
              const overIndex = overItems.indexOf(overId as string);

              const newIndex = overIndex >= 0 ? overIndex : overItems.length + 1;

              return prev.map((currentOrder) => {
                if (currentOrder.id === activeContainer.id) {
                  return {
                    id: currentOrder.id,
                    values: currentOrder.values.filter((itemId) => itemId !== active.id)
                  };
                }
                if (currentOrder.id === overContainer.id) {
                  return {
                    id: currentOrder.id,
                    values: [
                      ...currentOrder.values.slice(0, newIndex),
                      active.id as string,
                      ...currentOrder.values.slice(newIndex, currentOrder.values.length)
                    ]
                  };
                }
                return currentOrder;
              });
            });
          }
        }}
      >
        {containers.map((container) => {
          if (container.type === TYPE_LIST) {
            return (
              <DroppableList
                key={container.id}
                id={container.id}
                items={getContainerItems(container.id)}
                style={{
                  width: '100%'
                }}
              />
            );
          } else if (container.type === TYPE_TABLE_TABLE) {
            return (
              <DroppableTable
                key={container.id}
                id={container.id}
                columns={columns.slice(1, columns.length - 1)}
                columnOrder={columnOrder}
                rows={getContainerItems(container.id)}
              />
            );
          }
          return null;
        })}
        <DragOverlay>{activeId && renderDragOverlay(activeId)}</DragOverlay>
      </DndContext>
      <ResetButton onReset={handleReset} />
    </StorybookContainer>
  );
};

export const MultipleContainers = () => (
  <ClientProvider>
    <ProfileInitializer>
      <MultipleContainersStory />
    </ProfileInitializer>
  </ClientProvider>
);
