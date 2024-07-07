//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import {
  type Icon,
  CaretDown,
  CaretRight,
  Chat,
  Folder,
  House,
  User,
  UserCircle,
  Circle,
  List,
  Planet,
  Plus,
} from '@phosphor-icons/react';
import React, { type PropsWithChildren, useState } from 'react';

import { DensityProvider, Input } from '@dxos/react-ui';
import { fixedSurface, modalSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { ItemRow } from './Tree';

type Space = {
  id: string;
  Icon?: Icon;
  color?: string;
  name: string;
  icon?: any;
  children?: Space[];
};

type Comment = {
  id: string;
  label: string;
  messages: {
    id: string;
    text: string;
  }[];
};

const spaceData: Space[] = [
  {
    id: 'space-1',
    name: 'Home',
    Icon: House,
    color: 'border-orange-800',
    children: [
      {
        id: 'space-1.1',
        name: 'Item 1',
        children: [
          {
            id: 'space-1.1.1',
            name: 'Item 1.1',
          },
          {
            id: 'space-1.1.2',
            name: 'Item 1.2',
          },
          {
            id: 'space-1.1.3',
            name: 'Item 1.3',
            children: [
              {
                id: 'space-1.1.3.1',
                name: 'Item 1.3.1',
              },
            ],
          },
          {
            id: 'space-1.1.4',
            name: 'Item 1.4',
          },
        ],
      },
      {
        id: 'space-1.2',
        name: 'Item 2',
      },
      {
        id: 'space-1.3',
        name: 'Item 3',
      },
      {
        id: 'space-1.4',
        name: 'Item 4',
      },
    ],
  },
  {
    id: 'space-2',
    color: 'bg-green-500',
    name: 'Projects',
    children: [
      {
        id: 'space-2.1',
        name: 'Item 1',
      },
      {
        id: 'space-2.2',
        name: 'Item 2',
      },
      {
        id: 'space-2.3',
        name: 'Item 3',
      },
    ],
  },
  {
    id: 'space-3',
    name: 'Eng',
    children: [
      {
        id: 'space-3.1',
        name: 'Item 1',
      },
      {
        id: 'space-3.2',
        name: 'Item 2',
      },
    ],
  },
];

const commentData: Comment[] = [
  {
    id: 'comment-1',
    label: 'Spaces...',
    messages: [
      {
        id: 'message-1.1',
        text: 'We need to review the design.',
      },
      {
        id: 'message-1.2',
        text: 'Do you have any Figma mocks for this?',
      },
      {
        id: 'message-1.3',
        text: 'No, just the experimental',
      },
    ],
  },
  {
    id: 'comment-2',
    label: '...Comments',
    messages: [
      {
        id: 'message-2.1',
        text: 'The comments panels are similar to the space panels.',
      },
    ],
  },
];

const styles = {
  panel: 'bg-neutral-900 text-neutral-100',
  toolbarActive: 'bg-neutral-950',
  selected: '!bg-neutral-925',
  hover: 'hover:bg-neutral-950 hover:text-blue-500',
};

type ToolbarProps = {
  Icon: Icon;
  color?: string;
  open?: boolean;
  className?: string;
  selected?: boolean;
  title: string;
  onMenu?: () => string;
  onSelect?: () => void;
  onToggle?: () => void;
};

const Toolbar = ({
  Icon = Planet,
  color,
  open,
  className,
  selected,
  title,
  onMenu,
  onSelect,
  onToggle,
}: PropsWithChildren<ToolbarProps>) => {
  return (
    <div className={mx('flex items-center', selected && styles.toolbarActive, className)} onClick={onSelect}>
      <div className={mx('flex h-full items-center p-2 rounded-tl', !open && 'rounded-bl', color)}>
        <Icon className='cursor-pointer' onClick={onToggle} />
      </div>
      <div className='grow p-2 cursor-pointer' onClick={onToggle}>
        {title}
      </div>
      <div className='p-2'>
        <List className='cursor-pointer' onClick={onMenu} />
      </div>
    </div>
  );
};

type PanelProps = {
  open?: boolean;
  color?: string;
} & ToolbarProps;

const Panel = ({ open, color, children, ...props }: PropsWithChildren<PanelProps>) => {
  return (
    <div className={mx('flex flex-col rounded-md', styles.panel)}>
      <Toolbar
        open={open}
        className={mx('_border-b-2 _border-transparent', open ? 'rounded-t' : 'rounded')}
        color={color}
        {...props}
      />
      {open && <div className='flex flex-col'>{children}</div>}
    </div>
  );
};

type ItemProps = {
  space: Space;
  open?: boolean;
  selected?: boolean;
  active?: boolean;
};

const Item = ({ space, open, selected, active }: PropsWithChildren<ItemProps>) => {
  return (
    <div className='flex flex-col w-full'>
      <div className='flex w-full items-center'>
        <div className='p-2'>{(open && <CaretDown />) || <CaretRight />}</div>
        <div className='grow p-2'>{space.name}</div>
        <div className='p-2'>
          {(selected && (
            <Circle weight={active ? 'fill' : 'duotone'} className={mx('cursor-pointer text-blue-500')} />
          )) ||
            (active && <UserCircle className={mx('cursor-pointer opacity-50')} />) || (
              <Circle className={mx('cursor-pointer opacity-50')} />
            )}
        </div>
      </div>
      {open && space.children?.length && (
        <ul className='ml-4'>
          {space.children.map((child) => (
            <li key={child.id}>
              <Item space={child} open={true} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Notes:
 * - Space panels are delineated from each other to give them more weight than folders.
 * - Private space isn't different (just first, different icon).
 * - Edit titles in place.
 */
const SpacePanel = ({ space, onMenu, ...props }: { space: Space } & PanelProps) => {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [active] = useState<Record<string, boolean>>(() =>
    (space.children ?? []).reduce<Record<string, boolean>>((acc, child) => {
      if (Math.random() > 0.5) {
        acc[child.id] = true;
      }
      return acc;
    }, {}),
  );

  return (
    <Panel
      {...props}
      color={space.color}
      onMenu={
        onMenu
          ? () => {
              const id = onMenu();
              setSelected((selected) => ({ ...selected, [id]: true }));
              return id;
            }
          : undefined
      }
    >
      <ul>
        {space.children?.map((child) => (
          /*
           * Items have one of three states: selected, visitors, and default.
           */
          <li
            key={child.id}
            className={mx(
              'flex items-center cursor-pointer last:rounded-b',
              styles.hover,
              selected[child.id] && styles.selected,
            )}
            onClick={() => {
              setSelected((selected) => ({ ...selected, [child.id]: !selected[child.id] }));
            }}
          >
            <Item space={child} open={true} selected={selected[child.id]} active={active[child.id]} />
          </li>
        ))}
      </ul>
    </Panel>
  );
};

/**
 * Navigation:
 *  - up/down across spaces/folder
 *  - right to enter space/folder
 *  - left to parent
 */
const Sidebar = () => {
  const [spaces, setSpaces] = useState<Space[]>(spaceData);
  const [open, setOpen] = useState<Record<string, boolean>>({ [spaces[0].id]: true });
  const [selected, setSelected] = useState<string | undefined>(spaces[0].id);
  return (
    <div className={mx('flex flex-col h-full w-[300px] p-2 gap-2', fixedSurface)}>
      {spaces.map((space) => (
        <SpacePanel
          key={space.id}
          Icon={space.Icon ?? Planet}
          space={space}
          title={space.name}
          open={open[space.id]}
          selected={selected === space.id}
          onMenu={() => {
            const item = {
              id: `item-${(space.children?.length ?? 0) + 1}`,
              name: `Item ${(space.children?.length ?? 0) + 1}`,
            };
            space.children?.push(item);
            return item.id;
          }}
          onSelect={() => {
            setSelected(space.id);
          }}
          onToggle={() => {
            setOpen({ ...open, [space.id]: !open[space.id] });
          }}
        />
      ))}
      <div
        className='flex items-center gap-2 p-2 cursor-pointer'
        onClick={() => {
          setSpaces([
            ...spaces,
            {
              id: `space-${spaces.length + 1}`,
              name: `Space ${spaces.length + 1}`,
              children: [],
            },
          ]);
        }}
      >
        <Plus />
        <span>New Space</span>
      </div>
    </div>
  );
};

const Thread = () => {
  const [comments] = useState<Comment[]>(commentData);
  return (
    <div className={mx('flex flex-col h-full w-[300px] p-2 gap-2', fixedSurface)}>
      {comments.map((comment, i) => (
        <Panel key={comment.id} open selected title={comment.label} Icon={Chat}>
          <ul>
            {comment.messages.map((message) => (
              <li key={message.id} className='flex m-0 cursor-pointer last:rounded-b'>
                <div className='flex p-2'>
                  <User />
                </div>
                <div className='flex py-1 items-center grow'>{message.text}</div>
              </li>
            ))}
            {i === 1 && (
              <li className='pt-2'>
                <Input.Root>
                  <Input.TextInput classNames='!bg-transparent' autoFocus placeholder='Enter comment...' />
                </Input.Root>
              </li>
            )}
          </ul>
        </Panel>
      ))}
    </div>
  );
};

const Container = () => {
  return (
    <DensityProvider density='fine'>
      <div className={mx('absolute inset-0 flex', modalSurface)}>
        <Sidebar />
        <div className='flex flex-col grow'>
          <div className='flex flex-col w-[300px]'>
            <ItemRow id={'i-1'} title={'Item 1'} Icon={Folder} open onChangeOpen={() => {}} />

            <div className='w-full grid grid-cols-[24px_1fr]'>
              <div />
              <ItemRow id={'i-2'} title={'Item 1.1'} Icon={Folder} onChangeOpen={() => {}} />
            </div>

            <ItemRow id={'i-3'} title={'Item 2'} Icon={Folder} onChangeOpen={() => {}} />
          </div>
        </div>
        <Thread />
      </div>
    </DensityProvider>
  );
};

export default {
  title: 'plugin-navtree/experimental',
  component: Container,
  decorators: [withTheme],
};

export const Default = (props: any) => {
  return <Container {...props} />;
};
