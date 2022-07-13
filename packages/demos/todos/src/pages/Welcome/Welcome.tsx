import faker from 'faker';
import { useState } from 'react';
import Meta from '@/components/Meta';
import { FullSizeCenteredFlexBox } from '@/components/styled';
import TodoList, { TodoItem } from '@/components/TodoList';
import { useTheme } from '@mui/material/styles';
import useOrientation from '@/hooks/useOrientation';
import useEvent from '@react-hook/event';
import { Active,DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TodoList as TodoListDef } from '@/components/TodoList/models';
import { TodoListItem } from '@/components/TodoList/TodoListItem';

const TEST_LISTS_NUMBER = 10;

const Welcome = () => {
  const isPortrait = useOrientation();
  const theme = useTheme();
  const [active, setActive] = useState<Active>();

  const [lists, setLists] = useState<TodoListDef[]>(Array.from({ length: TEST_LISTS_NUMBER }).map((_, i) => ({
    id: `list-${i}`,
    title: `${faker.name.firstName()} ${faker.name.lastName()}`,
    items: []
  })));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (!active) {
      return;
    }
    setActive(active);
  };

  const handleDragEnd = ({ over }: DragEndEvent) => {
    if (!lists.length || !active || !over?.data.current) {
      return;
    }
    
    if ((over.id as string).split('-')[0] === 'list') {
      // reorderList();
      const listIds = lists.map(list => list.id);
      const overIndex = listIds.indexOf(over.id as string);
      const activeIndex = listIds.indexOf(active.id as string);
      const newLists = arrayMove(lists, activeIndex, overIndex);
      setLists(newLists);
      return;
    }
    
    const sourceList = lists.find(list => list.items.filter(item => item.id === active.id).length);
    const targetList = lists.find(list => list.id === over.data.current!.sortable.containerId);
    if (!sourceList || !targetList) {
      return;
    }

    let newSourceItems: TodoItem[] | undefined;
    if (sourceList.id !== targetList.id) {
      // Remove item from source
      const sourceOrderWithoutId = sourceList.items.filter(value => value.id !== active.id)
      newSourceItems = sourceOrderWithoutId;
    }

    const targetListIds = targetList.items.map(item => item.id);
    const overIndex = targetListIds.indexOf(over.id as string);
    const activeIndex = targetListIds.indexOf(active.id as string);
    if (activeIndex === overIndex) {
      return;
    }

    const newTargetItems = arrayMove(targetList.items, activeIndex, overIndex);
    setLists(prev => prev.map(list => {
      if (targetList.id === list.id) {
        return {
          ...list,
          items: newTargetItems
        };
      }

      if (newSourceItems && sourceList.id === list.id) {
        return {
          ...list,
          items: newSourceItems
        };
      }

      return list;
    }));

    setActive(undefined);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) {
      return;
    }
    
    if ((over.id as string).split('-')[0] === 'list') {
      // reorderList();
      const listIds = lists.map(list => list.id);
      const overIndex = listIds.indexOf(over.id as string);
      const activeIndex = listIds.indexOf(active.id as string);
      const newLists = arrayMove(lists, activeIndex, overIndex);
      setLists(newLists);
      return;
    }

    const activeList = lists.find(list => list.items.some(item => item.id === active.id));
    const overList = lists.find(list => list.items.some(item => item.id === over.id));

    if (!overList || !activeList) {
      return;
    }

    if (activeList.id !== overList.id) {
      setLists(prev => {
        const overItems = overList.items;
        const overIndex = overItems.map(item => item.id).indexOf(over.id as string);

        const newIndex = overIndex >= 0 ? overIndex : overItems.length + 1;

        return prev.map(list => {
          if (list.id === activeList.id) {
            return {
              ...list,
              items: activeList.items.filter(item => item.id !== active.id)
            };
          }
          if (list.id === overList.id) {
            return {
              ...list,
              items: [
                ...list.items.slice(0, newIndex),
                activeList.items.find(item => item.id === active.id),
                ...list.items.slice(newIndex)
              ]
            };
          }
          return list;
        });
      });
    }
  };

  const renderDragOverlay = () => {
    if ((active!.id as string).split('-')[0] === 'list') {
      return (
        <TodoList
          list={active!.data.current as TodoListDef}
          style={{
            // backgroundColor: i % 2=== 0 ? theme.palette.primary.main : theme.palette.secondary.main
            backgroundColor: theme.palette.primary.main
          }}
        />
      );
    }
    return (
      <TodoListItem
        item={active!.data.current as TodoItem}
        dragging
      />
    );
  };

  return (
    <>
      <Meta title="Home" />
      <FullSizeCenteredFlexBox
        flexDirection={isPortrait ? 'column' : 'row'}
        sx={{
          display: 'flex',
          gap: '1em',
          height: '100%',
          width: 'fit-content',
          padding: theme.mixins.contentContainer.padding
        }}
      >
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <SortableContext id='lists' items={lists.map(list => list.id)}>
            {lists.map((list, i) => (
              <TodoList
                key={list.id}
                list={list}
                style={{
                  backgroundColor: i % 2=== 0 ? theme.palette.primary.main : theme.palette.secondary.main
                }}
                onCreate={(s) => {
                  setLists(prev => prev.map(l => {
                    if (l.id !== list.id) {
                      return l;
                    }
                    return {
                      ...l,
                      items: [
                        {
                          id: faker.datatype.uuid(),
                          title: s,
                          createdAt: new Date(),
                        },
                        ...l.items
                      ]
                    }
                  }));
                }}
                onTitleChanged={(item, val) => {
                  item.title = val;
                  setLists([...lists]);
                }}
                onChecked={(item, val) => {
                  item.completedAt = val ? new Date() : void 0;
                  setLists([...lists]);
                }}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {active ? renderDragOverlay() : null}
          </DragOverlay>
        </DndContext>
      </FullSizeCenteredFlexBox>
    </>
  );
}

export default Welcome;
