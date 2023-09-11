//
// Copyright 2023 DXOS.org
//

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, DotsThreeVertical } from '@phosphor-icons/react';
import React, { FC, PropsWithChildren, ReactNode } from 'react';

import { DensityProvider, Input, List, ListItem } from '@dxos/aurora';
import { getSize, inputSurface, mx } from '@dxos/aurora-theme';

// TODO(burdon): Universal search.
// TODO(burdon): Cards are used across search, kanban, threads, notes, etc.

// Cards (grid/mosaic)
// - Chat message
// - Kanban/Note
// - Search result

// Layout
// - Square/rectangular.
// - Icon
// - Title
// - Body/sections
// - Menu
// - Expand

// Containers
// - CardStack (column)
// - CardGrid/Carousel
// - Masonry

export type CardProps = PropsWithChildren<{
  id: string;
  type?: string;
}>;

const cardContainerStyle = [
  'flex group min-w-[280px] max-w-[360px] max-h-[300px] overflow-hidden',
  'shadow-sm rounded',
  inputSurface,
];

const cardDefaultStyle = [...cardContainerStyle, 'px-4 py-2 gap-2'];

const handleIcon = 'flex shrink-0 h-6 items-center';

type LayoutProps = {
  handle?: ReactNode;
  menu?: ReactNode;
};

const DefaultLayout: FC<PropsWithChildren<LayoutProps & { title?: string; className?: string }>> = ({
  handle,
  menu,
  title,
  className,
  children,
}) => {
  return (
    <div className={mx(cardDefaultStyle)}>
      {handle && <div className={handleIcon}>{handle}</div>}
      <div className='flex flex-col grow gap-1 overflow-hidden'>
        {title && <div className={mx('shrink-0 truncate', className)}>{title}</div>}
        {children}
      </div>
      {menu && <div className={handleIcon}>{menu}</div>}
    </div>
  );
};

// TODO(burdon): Editable typed properties.
const FormLayout: FC<
  PropsWithChildren<
    LayoutProps & {
      title?: string;
      sections?: { label?: string; value: string }[];
    }
  >
> = ({ handle, menu, title, children, sections }) => {
  return (
    <DefaultLayout handle={handle} menu={menu} title={title}>
      <div className='flex flex-col gap-2'>
        {sections?.length &&
          sections.map(({ label, value }, i) => (
            <div key={i}>
              {label && <div className='font-thin text-xs'>{label}</div>}
              <div className='text-sm'>{value}</div>
            </div>
          ))}
        {children}
      </div>
    </DefaultLayout>
  );
};

// TODO(burdon): Editable.
const TextLayout: FC<LayoutProps & { title?: string; body?: string }> = ({ handle, menu, title, body }) => {
  return (
    <DefaultLayout handle={handle} menu={menu} title={title}>
      <div className='font-thin line-clamp-[6]'>{body}</div>
    </DefaultLayout>
  );
};

const MessageLayout: FC<LayoutProps & { from: string; message: string }> = ({ handle, menu, from, message }) => {
  return (
    <DefaultLayout handle={handle} menu={menu} title={from} className='text-sm font-thin'>
      <div>{message}</div>
    </DefaultLayout>
  );
};

// TODO(burdon): Option to cover/contain.
// TODO(burdon): Caption: https://www.radix-ui.com/themes/playground
const ImageLayout: FC<LayoutProps & { src: string; body?: string }> = ({ handle, menu, src }) => {
  return (
    <div className={mx(cardContainerStyle, 'relative')}>
      {handle && <div className='absolute bg-white opacity-50 mx-4 my-2'>{handle}</div>}
      {menu && <div className='absolute right-0 bg-white opacity-0 mx-4 my-2 group-hover:opacity-50'>{menu}</div>}
      <img className='object-cover rounded' src={src} />
    </div>
  );
};

export const Card: FC<LayoutProps & CardProps> = ({ id, type, handle, menu, ...props }) => {
  // TODO(burdon): Create factory with binders.
  const data: any = props;

  switch (type) {
    case 'contact': {
      return (
        <FormLayout
          handle={handle}
          menu={menu}
          title={data.name}
          sections={[
            { label: 'Username', value: data.username },
            { label: 'Email', value: data.email },
          ]}
        />
      );
    }
    case 'project': {
      return (
        <FormLayout
          handle={handle}
          menu={menu}
          title={data.name}
          sections={[
            {
              value: data.body,
            },
          ]}
        >
          <DensityProvider density='fine'>
            <List>
              {data.tasks.map((task: any) => (
                // TODO(burdon): Center align by default.
                <ListItem.Root key={task.id} classNames='flex items-center gap-2'>
                  <Input.Root>
                    <Input.Checkbox checked={task.done} />
                  </Input.Root>
                  <ListItem.Heading classNames='truncate'>{task.title}</ListItem.Heading>
                </ListItem.Root>
              ))}
            </List>
          </DensityProvider>
        </FormLayout>
      );
    }
    case 'document': {
      return <TextLayout handle={handle} menu={menu} title={data.title} body={data.body} />;
    }
    case 'message': {
      return <MessageLayout handle={handle} menu={menu} from={data.from} message={data.body} />;
    }
    case 'image': {
      return <ImageLayout handle={handle} menu={menu} body={data.body} src={data.src} />;
    }
    default:
      return null;
  }
};

/**
 * Card wrapper.
 * https://docs.dndkit.com/api-documentation/draggable/drag-overlay#wrapper-nodes
 */
export const DraggableCard: FC<CardProps> = ({ id, type, ...props }) => {
  // https://docs.dndkit.com/api-documentation/draggable/usedraggable
  const { attributes, listeners, transform, isDragging, setNodeRef } = useDraggable({ id });
  const style = {
    transform: transform ? CSS.Transform.toString(Object.assign(transform, { scaleY: 1 })) : undefined,
  };

  const handle = (
    <DotsSixVertical
      className={mx(getSize(5), 'outline-none cursor-pointer hover:bg-neutral-50')}
      {...attributes}
      {...listeners}
    />
  );

  const menu = <DotsThreeVertical className={mx(getSize(5))} />;

  return (
    <div ref={setNodeRef} style={style} className={mx(isDragging && 'z-10 relative ring ring-red-500')}>
      <Card id={id} type={type} handle={handle} menu={menu} {...props} />
    </div>
  );
};
