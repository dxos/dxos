//
// Copyright 2023 DXOS.org
//

import { focusRing, ghostSelected, ghostSelectedCurrent, groupBorder, mx } from '@dxos/react-ui-theme';
import { type ComponentFunction } from '@dxos/react-ui-types';

import { type TableContextValue, type TableFlags } from './components';

export const currentRow = '!bg-neutral-75 !dark:bg-neutral-850';
export const selectedRow = '!bg-primary-100 dark:!bg-primary-700';
export const flushPadding = 'pli-0 plb-0';
export const textPadding = 'pli-2 plb-0';
export const headPadding = 'pli-2';

export const gridCellFocusRing = 'focus-within:outline outline-2 outline-primary-500 dark:outline-primary-400';

//
// table
//

export type TableStyleProps = Partial<TableContextValue<any>>;

export const tableRoot: ComponentFunction<TableStyleProps> = ({ fullWidth }, ...etc) =>
  mx('table-fixed', fullWidth && 'is-full', ...etc);

export const groupTh: ComponentFunction<TableStyleProps> = (_props, ...etc) =>
  mx('text-start font-medium', flushPadding, ...etc);

//
// thead
//

export type TheadStyleProps = Partial<TableFlags>;

export const theadRoot: ComponentFunction<TheadStyleProps> = ({ header, stickyHeader }, ...etc) =>
  mx(
    header ? stickyHeader && 'sticky block-start-[--sticky-top] z-[1]' : 'collapse',
    'drop-shadow-sm',
    'bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
    ...etc,
  );

export const theadTr: ComponentFunction<TheadStyleProps> = (_props, ...etc) => mx('group', ...etc);

export const theadTh: ComponentFunction<TheadStyleProps> = ({ border }, ...etc) =>
  mx(
    'relative',
    'text-start text-xs select-none truncate',
    headPadding,
    border && groupBorder,
    border && 'border border-t-0 border-b-0 border-neutral-200',
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

//
// tbody
//

export type TbodyStyleProps = Partial<TableContextValue<any>>;
export const tbodyRoot: ComponentFunction<TbodyStyleProps> = (_props, ...etc) => mx(...etc);

export type TbodyTrStyleProps = Partial<{ canBeCurrent?: boolean; isPinned?: boolean }>;
export const tbodyTr: ComponentFunction<TbodyTrStyleProps> = ({ canBeCurrent, isPinned }, ...etc) =>
  mx(
    'group',
    canBeCurrent ? ghostSelectedCurrent : ghostSelected,
    canBeCurrent && focusRing,
    canBeCurrent && 'cursor-pointer',
    isPinned && 'sticky z-1 bottom-0 bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
    ...etc,
  );

//
// td, th
//

export const tdRoot: ComponentFunction<TbodyStyleProps> = ({ border, isGrid }, ...etc) =>
  mx(
    'relative',
    flushPadding,
    border && 'border border-neutral-200 dark:border-neutral-700',
    isGrid && gridCellFocusRing,
    ...etc,
  );
