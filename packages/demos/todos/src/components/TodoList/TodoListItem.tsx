import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TodoItem } from './models';
import Checkbox from '@mui/material/Checkbox';

export type TodoItemProps = {
  dragging?: boolean;
  item?: TodoItem;
  onTitleChanged?: (val: string) => any;
  onChecked?: (newState: boolean) => any;
  onSubmit?: (val: string) => any;
};
export function TodoListItem(props: TodoItemProps) {
  const { item, onTitleChanged, onChecked, onSubmit, dragging } = props;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item?.id ?? '',
    data: item,
  });
  const theme = useTheme();
  return (
    <ListItem
      ref={setNodeRef}
      sx={{
        boxShadow: dragging ? 3 : 0,
        transform: CSS.Transform.toString(transform),
        transition,
        background: theme.palette.background.paper,
      }}
      secondaryAction={<DragHandleIcon sx={{ cursor: 'grab' }} />}
      {...attributes}
      {...listeners}
    >
      <ListItemButton>
        <ListItemIcon>
          <Checkbox
            edge="start"
            checked={!!item?.completedAt}
            disableRipple
            onChange={(e) => onChecked?.(e.target.checked)}
          />
        </ListItemIcon>
        <ListItemText>
          <TextField
            variant="standard"
            disabled={!!item?.completedAt}
            defaultValue={item?.title}
            placeholder={'start typing'}
            onChange={(e) => onTitleChanged?.(e.target.value)}
            onKeyUp={(e) => {
              if (e.key == 'Enter') {
                const input = e.target as HTMLInputElement;
                const val = input?.value;
                onSubmit?.(val);
                input.value = '';
              }
            }}
          />
        </ListItemText>
      </ListItemButton>
    </ListItem>
  );
}
