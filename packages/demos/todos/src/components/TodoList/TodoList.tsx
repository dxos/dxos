import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import { TodoListItem } from './TodoListItem';
import { TodoItem } from './models';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  Active,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
export type TodoListProps = {
  items?: TodoItem[];
  onCreate?: (s: string) => any;
  onChecked?: (item: TodoItem, value: boolean) => any;
  onTitleChanged?: (item: TodoItem, value: string) => any;
  onDrop?: (e: DragEndEvent) => any;
};

export function TodoList(props: TodoListProps) {
  const { items, onCreate, onChecked, onTitleChanged, onDrop } = { items: [], ...props };
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const submitOnEnter: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key == 'Enter') {
      const input = e.target as HTMLInputElement;
      const val = input?.value;
      onCreate?.(val);
      input.value = '';
    }
  };
  const [dragging, setDragging] = useState<Active | null>(null);
  return (
    <Box>
      <List>
        <TodoListItem onSubmit={(e) => onCreate?.(e)} />
        {/* <ListItem key={'new-item'}>
          <ListItemButton>
            <ListItemIcon>
              <CheckBoxOutlineBlankIcon />
            </ListItemIcon>
            <ListItemText>
              <TextField
                variant="standard"
                placeholder="type here"
                autoFocus
                onKeyUp={submitOnEnter}
              />
            </ListItemText>
          </ListItemButton>
        </ListItem> */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setDragging(active)}
          onDragEnd={onDrop}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items?.map((item) => (
              <TodoListItem
                item={item}
                key={item.id}
                onChecked={(e) => onChecked?.(item, e)}
                onTitleChanged={(v) => onTitleChanged?.(item, v)}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {dragging ? <TodoListItem item={dragging.data.current as TodoItem} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </List>
    </Box>
  );
}
