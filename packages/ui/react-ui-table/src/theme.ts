//
// Copyright 2023 DXOS.org
//

import { chromeSurface, inputSurface, groupBorder, mx } from '@dxos/react-ui-theme';
import { type ComponentFunction } from '@dxos/react-ui-types';

import { type TableBodyProps, type TableFootProps, type TableHeadProps, type TableProps } from './components';

export const selectedRow = '!bg-primary-100 dark:!bg-primary-700';

//
// table
//

export type TableStyleProps = Partial<TableProps<any>>;

export const tableRoot: ComponentFunction<TableStyleProps> = ({ fullWidth }, ...etc) =>
  mx(inputSurface, fullWidth && 'table-fixed', ...etc);

export const groupTh: ComponentFunction<TableStyleProps> = (_props, ...etc) =>
  mx('px-2 font-light text-xs text-left', ...etc);

//
// thead
//

export type TheadStyleProps = Partial<TableHeadProps<any>>;

export const theadRoot: ComponentFunction<TheadStyleProps> = ({ header }, ...etc) =>
  mx(header ? 'sticky block-start-0 z-10' : 'collapse', ...etc);

export const theadTr: ComponentFunction<TheadStyleProps> = (_props, ...etc) => mx('group', ...etc);

export const theadTh: ComponentFunction<TheadStyleProps> = ({ border }, ...etc) =>
  mx('relative text-start font-medium pli-2 select-none', border && groupBorder, ...etc);

export const theadResizeRoot: ComponentFunction<TheadStyleProps> = (_props, ...etc) =>
  mx(
    'absolute top-0 pl-1 h-full z-[10] w-[7px] -right-[5px] cursor-col-resize select-none touch-none opacity-20 hover:opacity-100',
    ...etc,
  );

export const theadResizeThumb: ComponentFunction<TheadStyleProps> = (_props, ...etc) =>
  mx('flex group-hover:bg-neutral-700 -ml-[2px] w-[1px] h-full', ...etc);

//
// tbody
//

export type TbodyStyleProps = Partial<TableBodyProps<any>>;

export const tbodyRoot: ComponentFunction<TbodyStyleProps> = (_props, ...etc) => mx(...etc);
export const tbodyTr: ComponentFunction<TbodyStyleProps> = (_props, ...etc) => mx('group', ...etc);
export const tbodyTd: ComponentFunction<TbodyStyleProps> = ({ border }, ...etc) =>
  mx('pli-2', border && groupBorder, ...etc);

//
// tfoot
//

export type TfootStyleProps = Partial<TableFootProps<any>>;

export const tfootRoot: ComponentFunction<TfootStyleProps> = (_props, ...etc) =>
  mx('sticky block-end-0 z-10 pli-2', chromeSurface, ...etc);

export const tfootRow: ComponentFunction<TfootStyleProps> = (_props, ...etc) => mx(...etc);

export const tfootTh: ComponentFunction<TfootStyleProps> = ({ border }, ...etc) =>
  mx('pli-2', chromeSurface, border && groupBorder, ...etc);
