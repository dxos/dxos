//
// Copyright 2024 DXOS.org
//

import { CaretRight, Circle, File, Folder, type Icon, type IconProps, Plus, UserCircle } from '@phosphor-icons/react';
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
} & Pick<IconProps, 'weight'> &
  Pick<HTMLAttributes<HTMLDivElement>, 'onClick'>) => {
  // TODO(burdon): Density aware.
  return (
    <div className={mx('flex w-6 h-6 items-center justify-center select-none', classNames)} onClick={onClick}>
      <Icon className={mx(getSize(size), 'cursor-pointer')} {...props} />
    </div>
  );
};

export type TreeNodeData = {
  id: string;
  title: string;
  Icon?: Icon;
  color?: string;
  children?: TreeNodeData[];
};

export type TreeIteratorNode = {
  node: TreeNodeData;
  depth: number;
};

export function* visitor(node: TreeNodeData, open: ItemMap): Generator<TreeIteratorNode> {
  const stack: TreeIteratorNode[] = [{ node, depth: 0 }];
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (depth > 0) {
      yield { node, depth };
    }

    const children = Array.from(node.children ?? []);
    if (depth === 0 || open[node.id]) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        stack.push({ node: child, depth: depth + 1 });
      }
    }
  }
}

export const visitNodes = <T,>(
  node: TreeNodeData,
  callback: (node: TreeNodeData, depth: number) => T,
  depth = 0,
): T | undefined => {
  const result = callback(node, depth);
  if (result) {
    return result;
  }

  for (const child of node.children ?? []) {
    const result = visitNodes(child, callback, depth + 1);
    if (result) {
      return result;
    }
  }
};

export type ItemMap<T = boolean> = Record<TreeNodeData['id'], T>;

export type TreeNodeProps = {
  node: TreeNodeData;
  depth?: number;
  getSlots?: (
    node: TreeNodeData,
    open: boolean,
    depth: number,
    ancestors: TreeNodeData[],
  ) => { root?: string; header?: string } | undefined;

  // Component state is separate from the data (stored separately).
  open?: ItemMap;
  selected?: ItemMap;
  active?: ItemMap;

  onChangeOpen?: (id: string, open: boolean) => void;
  onChangeSelected?: (id: string, select: boolean) => void;
  onMenuAction?: (id: string, action: string) => void;
};

const StateIcon = ({ node, open, selected, active }: TreeNodeProps) => {
  const { id } = node;

  // Check if any children are active.
  let isChildActive = false;
  if (!active?.[id] && !open?.[id]) {
    isChildActive = !!visitNodes(node, ({ id }) => {
      if (active?.[id]) {
        return true;
      }
    });
  }

  const isActive = active?.[id] || isChildActive;

  // TODO(burdon): No animation if opening/closing folder.
  return (
    <IconButton
      Icon={isActive ? UserCircle : Circle}
      size={4}
      weight={selected?.[id] ? 'fill' : 'duotone'}
      classNames={mx(
        'text-slate-500',
        !isChildActive && 'opacity-0 transition duration-500',
        (isActive || selected?.[id]) && 'opacity-100',
      )}
    />
  );
};

const OpenIcon = ({
  node: { id, children },
  open,
  onChangeOpen,
}: Pick<TreeNodeProps, 'node' | 'open' | 'onChangeOpen'>) => {
  return (
    (children?.length && open && (
      <IconButton
        Icon={CaretRight}
        size={3}
        classNames={mx('transition duration-100', open?.[id] ? 'rotate-90' : 'transform-none')}
        onClick={(ev) => {
          ev.stopPropagation();
          onChangeOpen?.(id, !open[id]);
        }}
      />
    )) || <div />
  );
};

// TODO(burdon): Drag handle,
const ItemIcon = ({
  node: { children, Icon = children?.length ? Folder : File, color },
}: Pick<TreeNodeProps, 'node'>) => {
  return (
    (Icon && (
      <IconButton
        Icon={Icon}
        classNames={color ?? 'text-neutral-700 dark:text-neutral-300'}
        weight={color ? 'duotone' : 'regular'}
      />
    )) || <div />
  );
};

const MenuItem = ({ node: { id }, onMenuAction }: Pick<TreeNodeProps, 'node' | 'onMenuAction'>) => {
  return (
    <IconButton
      Icon={Plus}
      classNames='invisible group-hover:visible'
      onClick={(ev) => {
        ev.stopPropagation();
        onMenuAction?.(id, 'create');
      }}
    />
  );
};

// TODO(burdon): Editable.
export const Title = ({ node: { title } }: Pick<TreeNodeProps, 'node'>) => {
  return (
    <div className='grow p-1 text-sm whitespace-nowrap truncate text-neutral-800 dark:text-neutral-200'>{title}</div>
  );
};

export const Grid = ({
  className,
  ...props
}: PropsWithChildren<{ className?: string }> & HTMLAttributes<HTMLDivElement>) => {
  // TODO(burdon): Density aware.
  return <div className={mx('grid grid-cols-[24px_24px_1fr_24px_24px]', className)} {...props} />;
};

export const TreeNodeRow = (props: TreeNodeProps & { className?: string }) => {
  const {
    node: { id },
    className,
    depth = 0,
    selected,
    onChangeSelected,
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
      onClick={() => selected && onChangeSelected?.(id, !selected[id])}
    >
      <OpenIcon {...props} />
      <ItemIcon {...props} />
      <Title {...props} />
      <MenuItem {...props} />
      <StateIcon {...props} />
    </Grid>
  );
};

export const TreeNode = (props: TreeNodeProps & { ancestors?: TreeNodeData[] }) => {
  const {
    node: { id, children },
    depth = 0,
    getSlots,
    open,
    ancestors = [],
  } = props;
  const { root, header } = getSlots?.(props.node, open?.[id] ?? false, depth, ancestors) ?? {};

  return (
    <div role='none' className={mx('flex flex-col', root)}>
      <TreeNodeRow {...props} className={header} />
      {(children?.length ?? 0) > 0 && open?.[id] && <TreeChildNodes {...props} ancestors={ancestors} />}
    </div>
  );
};

export const TreeChildNodes = ({
  className,
  ...props
}: TreeNodeProps & { ancestors?: TreeNodeData[]; className?: string }) => {
  const {
    node: { children },
    depth = 0,
    ancestors = [],
  } = props;
  return (
    <div className={mx('flex flex-col mt-0.5 gap-0.5', className)}>
      {children?.map((child, i) => (
        <TreeNode key={child.id} {...props} depth={depth + 1} node={child} ancestors={[...ancestors, props.node]} />
      ))}
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
