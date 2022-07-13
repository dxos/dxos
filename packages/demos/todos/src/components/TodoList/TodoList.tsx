import { CSSProperties } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { TodoListItem } from './TodoListItem';
import { TodoItem, TodoList as TodoListDef } from './models';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Typography } from '@mui/material';

export type TodoListProps = {
  list: TodoListDef
  onCreate?: (s: string) => void
  onChecked?: (item: TodoItem, value: boolean) => void
  onTitleChanged?: (item: TodoItem, value: string) => void
  style?: CSSProperties
};

export function TodoList(props: TodoListProps) {
  const { list, onCreate, onChecked, onTitleChanged, style } = { ...props };
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: list.id ?? '',
    data: list,
  });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        height: '100%',
        width: '20em',
        overflowY: 'auto',
        transform: CSS.Transform.toString(transform),
        transition,
        ...style
      }}
      {...attributes}
    >
      <Box display='flex' alignItems='center' justifyContent='space-between' marginRight='1em'>
        <Typography sx={{ padding: '1em' }}>{list.title}</Typography>
        <DragHandleIcon
          sx={{
            cursor: 'grab'
          }}
          {...listeners}
        />
      </Box>
      <List>
        <TodoListItem onSubmit={(e) => onCreate?.(e)} />
        <SortableContext id={list.id} items={list.items} strategy={verticalListSortingStrategy}>
          {list.items?.map(item => (
            <TodoListItem
              item={item}
              key={item.id}
              onChecked={(e) => onChecked?.(item, e)}
              onTitleChanged={(v) => onTitleChanged?.(item, v)}
            />
          ))}
        </SortableContext>
      </List>
    </Box>
  );
}
