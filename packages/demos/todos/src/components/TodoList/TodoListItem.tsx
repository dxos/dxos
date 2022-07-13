import { useTheme } from '@mui/material/styles';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TodoItem } from './models';
import Checkbox from '@mui/material/Checkbox';

export type TodoItemProps = {
  dragging?: boolean
  item?: TodoItem
  onTitleChanged?: (val: string) => void
  onChecked?: (newState: boolean) => void
  onSubmit?: (val: string) => void
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
      secondaryAction={Boolean(item) && (
        <DragHandleIcon
          sx={{
            cursor: 'grab'
          }}
          {...listeners}
        />
      )}
      {...attributes}
    >
      {item && (
        <ListItemIcon>
          <Checkbox
            edge="start"
            checked={!!item?.completedAt}
            disableRipple
            onChange={(e) => onChecked?.(e.target.checked)}
            sx={{
              display: item ? 'flex' : 'none'
            }}
          />
        </ListItemIcon>
      )}
      <ListItemText>
        <TextField
          variant="standard"
          disabled={!!item?.completedAt}
          defaultValue={item?.title}
          placeholder={'Start typing'}
          InputProps={{
            spellCheck: 'false',
            sx: {
              border: 'none',
              "input": {
                textOverflow: 'ellipsis',
              },
              "&&&:before": {
                borderBottom: "none"
              },
              "&&:after": {
                  borderBottom: "none"
              }
            }
          }}
          onChange={(e) => onTitleChanged?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key == 'Enter') {
              const input = e.target as HTMLInputElement;
              if (input.value) {
                onSubmit?.(input.value);
                input.value = '';
              }
            }
          }}
        />
      </ListItemText>
    </ListItem>
  );
}
