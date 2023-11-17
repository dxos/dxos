//
// Copyright 2023 DXOS.org
//

import { type CellContext } from '@tanstack/react-table';

import { chromeSurface, fixedSurface, groupBorder, mx } from '@dxos/react-ui-theme';
import { type ComponentFunction } from '@dxos/react-ui-types';

import { type TableContextValue, type TableFlags } from './components/Table/props';

export const selectedRow = '!bg-primary-100 dark:!bg-primary-700';
export const flushPadding = 'pli-0 plb-0';
export const textPadding = 'pli-2 plb-0.5';
export const headPadding = 'pli-2 plb-1.5';

export const gridCellFocusRing = 'focus:z-[11] focus:outline outline-2 outline-primary-500 dark:outline-primary-400';

//
// table
//

export type TableStyleProps = Partial<TableContextValue<any>>;

export const tableRoot: ComponentFunction<TableStyleProps> = (_props, ...etc) => mx('table-fixed', ...etc);

export const groupTh: ComponentFunction<TableStyleProps> = (_props, ...etc) =>
  mx('text-start font-medium', flushPadding, ...etc);

//
// thead
//

export type TheadStyleProps = Partial<TableFlags>;

export const theadRoot: ComponentFunction<TheadStyleProps> = ({ header }, ...etc) =>
  mx(header ? 'sticky block-start-0 z-10' : 'collapse', header && fixedSurface, ...etc);

export const theadTr: ComponentFunction<TheadStyleProps> = (_props, ...etc) => mx('group', ...etc);

export const theadTh: ComponentFunction<TheadStyleProps> = ({ border }, ...etc) =>
  mx(
    'relative text-start font-medium select-none truncate',
    headPadding,
    border && 'border',
    border && groupBorder,
    ...etc,
  );

export const theadResizeRoot: ComponentFunction<TheadStyleProps> = (_props, ...etc) =>
  mx(
    'absolute top-0 pis-1 h-full z-[10] w-[7px] -right-[5px] cursor-col-resize select-none touch-none opacity-20 hover:opacity-100',
    ...etc,
  );

export const theadResizeThumb: ComponentFunction<TheadStyleProps> = (_props, ...etc) =>
  mx('flex group-hover:bg-neutral-700 -ml-[2px] w-[1px] h-full', ...etc);

//
// tbody
//

export type TbodyStyleProps = Partial<TableContextValue<any>>;

export const tbodyRoot: ComponentFunction<TbodyStyleProps> = (_props, ...etc) => mx(...etc);
export const tbodyTr: ComponentFunction<TbodyStyleProps> = (_props, ...etc) => mx('group', ...etc);

//
// td, th
//

export const tdRoot: ComponentFunction<TbodyStyleProps> = ({ border, isGrid }, ...etc) =>
  mx('relative', flushPadding, border && 'border', border && groupBorder, isGrid && gridCellFocusRing, ...etc);
export const tdContent: ComponentFunction<CellContext<any, any>> = (_props, ...etc) => mx(...etc);

//
// tfoot
//

export type TfootStyleProps = Partial<TableContextValue<any>>;

export const tfootRoot: ComponentFunction<TfootStyleProps> = (_props, ...etc) =>
  mx('sticky block-end-0 z-10', chromeSurface, ...etc);

export const tfootTr: ComponentFunction<TfootStyleProps> = (_props, ...etc) => mx(...etc);

export const tfootTh: ComponentFunction<TfootStyleProps> = ({ border }, ...etc) =>
  mx(textPadding, chromeSurface, border && groupBorder, ...etc);
