//
// Copyright 2024 DXOS.org
//

import { CaretRight, File, Folder, type Icon, type IconProps, Plus, UserCircle } from '@phosphor-icons/react';
import React, { type HTMLAttributes, type PropsWithChildren } from 'react';

import { type ClassNameValue, type Size } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Rounded border if first/last.
const styles = {
  hover: 'hover:bg-slate-400 dark:hover:bg-slate-800',
  selected: '!bg-slate-300 dark:!bg-slate-700',
};

export const IconButton = ({
  Icon,
  classNames,
  size = 4,
  onClick,
  ...props
}: {
  Icon: Icon;
  classNames?: ClassNameValue;
  size?: Size;
  onClick?: () => void;
} & Pick<IconProps, 'weight'>) => {
  // TODO(burdon): Density.
  return (
    <div className={mx('flex w-6 h-6 items-center justify-center select-none', classNames)} onClick={onClick}>
      <Icon className={mx(getSize(size), 'cursor-pointer')} {...props} />
    </div>
  );
};

export type TreeNodeData = {
  id: string;
  title: string;
  color?: string;
  Icon?: Icon;
  children?: TreeNodeData[];
};

export type ItemMap<T = boolean> = Record<string, T>;

export const visitNodes = (
  obj: TreeNodeData,
  callback: (obj: TreeNodeData, depth: number) => boolean | void,
  depth = 0,
): boolean | void => {
  const result = callback(obj, depth);
  if (result) {
    return result;
  }

  if (obj.children) {
    for (const child of obj.children) {
      const result = visitNodes(child, callback, depth + 1);
      if (result) {
        return result;
      }
    }
  }
};

export type TreeNodeProps = {
  node: TreeNodeData;
  depth?: number;
  getSlots?: (node: TreeNodeData, open: boolean, depth: number) => { root?: string; header?: string } | undefined;
  open?: ItemMap;
  selected?: ItemMap;
  active?: ItemMap;
  onChangeOpen?: (id: string, open: boolean) => void;
  onChangeSelected?: (id: string, select: boolean) => void;
  onMenuAction?: (id: string, action: string) => void;
};

export const StateIcon = ({ node, open, selected, active }: TreeNodeProps) => {
  const { id } = node;
  let isActive = active?.[id];

  // Check if any children are active.
  if (!isActive && !open?.[id]) {
    visitNodes(node, (node) => {
      if (active?.[node.id]) {
        isActive = true;
        return true;
      }
    });
  }

  if (isActive) {
    return (
      <IconButton Icon={UserCircle} size={4} weight={selected?.[id] ? 'fill' : 'duotone'} classNames='text-slate-500' />
    );
  }

  // if (selected?.[id]) {
  //   return <IconButton Icon={Circle} size={4} weight='fill' classNames='text-blue-500' />;
  // }

  return <div />;
};

export const Grid = ({
  className,
  ...props
}: PropsWithChildren<{ className?: string }> & HTMLAttributes<HTMLDivElement>) => {
  return <div className={mx('grid grid-cols-[24px_24px_1fr_24px_24px]', className)} {...props} />;
};

export const TreeNodeRow = (props: TreeNodeProps & { className?: string }) => {
  const {
    node: { children, color, Icon = children?.length ? Folder : File, id, title },
    className,
    depth = 0,
    open,
    selected,
    onChangeOpen,
    onChangeSelected,
    onMenuAction,
  } = props;

  return (
    <Grid
      style={{ paddingLeft: `${(depth - 1) * 24}px` }}
      className={mx(
        'group w-full items-center cursor-pointer',
        styles.hover,
        selected?.[id] && styles.selected,
        className,
      )}
    >
      {(children?.length && open && (
        <IconButton
          Icon={CaretRight}
          size={3}
          onClick={() => onChangeOpen?.(id, !open[id])}
          classNames={mx('transition duration-100', open?.[id] ? 'rotate-90' : 'transform-none')}
        />
      )) || <div />}
      {/* TODO(burdon): Drag handle. */}
      {(Icon && (
        <IconButton
          Icon={Icon}
          classNames={color ?? 'text-neutral-800 dark:text-neutral-200'}
          weight={color ? 'duotone' : 'regular'}
          onClick={() => onChangeSelected?.(id, true)}
        />
      )) || <div />}
      {/* TODO(burdon): Editable title. */}
      <div
        className='grow p-1 text-sm whitespace-nowrap truncate text-neutral-800 dark:text-neutral-200'
        onClick={() => selected && onChangeSelected?.(id, !selected[id])}
      >
        {title}
      </div>
      <IconButton Icon={Plus} classNames='invisible group-hover:visible' onClick={() => onMenuAction?.(id, 'create')} />
      <StateIcon {...props} />
    </Grid>
  );
};

export const TreeNode = (props: TreeNodeProps) => {
  const {
    node: { id, children },
    depth = 0,
    getSlots,
    open,
  } = props;
  const { root, header } = getSlots?.(props.node, open?.[id] ?? false, depth) ?? {};

  return (
    <div role='none' className={mx('flex flex-col', root)}>
      <TreeNodeRow {...props} className={header} />
      {(children?.length ?? 0) > 0 && open?.[id] && <TreeChildNodes {...props} />}
    </div>
  );
};

export const TreeChildNodes = ({ className, ...props }: TreeNodeProps & { className?: string }) => {
  const {
    node: { children },
    depth = 0,
  } = props;
  return (
    <div className={mx('flex flex-col', className)}>
      {children?.map((child) => <TreeNode key={child.id} {...props} depth={depth + 1} node={child} />)}
    </div>
  );
};

export type TreeProps = { className?: string; showRoot?: boolean } & TreeNodeProps;

export const Tree = ({ className, showRoot, ...props }: TreeProps) => {
  if (showRoot) {
    return (
      <div className={className}>
        <TreeNode {...props} depth={0} />
      </div>
    );
  } else {
    return (
      <div className={className}>
        <TreeChildNodes {...props} className={className} depth={0} node={props.node} />
      </div>
    );
  }
};
