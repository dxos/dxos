//
// Copyright 2024 DXOS.org
//

import { focusRing, ghostSelected, ghostSelectedCurrent, mx } from '@dxos/react-ui-theme';
import { type ComponentFunction } from '@dxos/react-ui-types';

import { type TableContextValue, type TableFlags } from './components';

export const currentRow = '!bg-neutral-75 !dark:bg-neutral-850';
export const selectedRow = '!bg-primary-100 dark:!bg-primary-700';
export const flushPadding = 'pli-0 plb-0';
export const textPadding = 'pli-2 plb-0';
export const headPadding = 'pli-2';

export const gridCellFocusRing =
  'relative focus-within:outline focus-within:outline-1 outline-primary-500 outline-offset-[-1px]';

const borderColors = 'border-neutral-200 dark:border-neutral-700';

const stickyRowColors = 'bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';

export type TableStyleProps = Partial<TableContextValue<any>>;

export const tableRoot: ComponentFunction<TableStyleProps> = ({ fullWidth }, ...etc) =>
  mx('table-fixed', fullWidth && 'is-full', ...etc);

export const groupTh: ComponentFunction<TableStyleProps> = (_props, ...etc) =>
  mx('text-start font-medium', flushPadding, ...etc);

export type TheadStyleProps = Partial<TableFlags>;

export const theadRoot: ComponentFunction<TheadStyleProps> = ({ header, stickyHeader }, ...etc) =>
  mx(header ? stickyHeader && 'sticky block-start-[--sticky-top] z-[1]' : 'collapse', stickyRowColors, ...etc);

export const theadTr: ComponentFunction<TheadStyleProps> = (_props, ...etc) => mx('group', ...etc);

export const theadTh: ComponentFunction<TheadStyleProps> = ({ border }, ...etc) =>
  mx(
    'relative',
    'text-start text-xs select-none truncate',
    headPadding,
    border && borderColors,
    border && 'border',
    ...etc,
  );

export const theadResizeRoot: ComponentFunction<{ isResizing: boolean }> = ({ isResizing }) => {
  return mx(
    'absolute h-full w-[4px] top-0 right-0',
    'cursor-col-resize',
    'user-select-none',
    'touch-action-none',
    !isResizing && 'group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800',
    'pointer-coarse:bg-neutral-100 dark:pointer-coarse:bg-neutral-800',
    isResizing && 'bg-primary-500 dark:bg-primary-400',
  );
};

export type TbodyStyleProps = Partial<TableContextValue<any>>;
export const tbodyRoot: ComponentFunction<TbodyStyleProps> = (_props, ...etc) => mx(...etc);

export type TbodyTrStyleProps = Partial<{ canBeCurrent?: boolean; isPinned?: boolean }>;
export const tbodyTr: ComponentFunction<TbodyTrStyleProps> = ({ canBeCurrent, isPinned }, ...etc) =>
  mx(
    'group',
    canBeCurrent ? ghostSelectedCurrent : ghostSelected,
    canBeCurrent && focusRing,
    canBeCurrent && 'cursor-pointer',
    isPinned && 'sticky z-1 block-end-0',
    isPinned && stickyRowColors,
    ...etc,
  );

export const tdRoot: ComponentFunction<TbodyStyleProps> = ({ border, isGrid }, pinned, ...etc) =>
  mx(
    'relative',
    flushPadding,
    border && 'border-b border-l last:border-r border-neutral-200 dark:border-neutral-700',
    pinned && 'border-t',
    isGrid && gridCellFocusRing,
    ...etc,
  );
