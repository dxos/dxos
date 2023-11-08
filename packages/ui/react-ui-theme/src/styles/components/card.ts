//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Density, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { getSize, inputSurface } from '../fragments';

const defaults = {
  width: 'min-w-[256px]',
};

export type CardStyleProps = Partial<{
  density: Density;
  grow?: boolean;
  square?: boolean;
  rounded?: boolean;
  noPadding?: boolean;
}>;

export const cardRoot: ComponentFunction<CardStyleProps> = ({ grow, square, rounded = true }, ...etc) =>
  mx(
    'flex flex-col group/card overflow-hidden',
    grow && 'h-full',
    defaults.width,
    inputSurface,
    'shadow', // TODO(burdon): Elevation?
    rounded && 'rounded',
    square && 'aspect-square',
    ...etc,
  );

export const cardHeader: ComponentFunction<CardStyleProps & { floating?: boolean }> = ({ floating }, ...etc) =>
  mx(floating ? 'relative' : 'flex w-full shrink-0 justify-between overflow-hidden items-center py-1', ...etc);

export const cardTitle: ComponentFunction<CardStyleProps & { center?: boolean }> = ({ center }, ...etc) =>
  mx('grow overflow-hidden truncate first:pl-4 last:pr-4', center && 'text-center', ...etc);

export const cardDragHandle: ComponentFunction<CardStyleProps & { position?: 'left' | 'right' }> = (
  { density, position },
  ...etc
) =>
  mx(
    'flex shrink-0 items-center justify-center select-none',
    density === 'fine' ? getSize(8) : getSize(10),
    position === 'left' && 'absolute top-1 left-1',
    position === 'right' && 'absolute top-1 right-1',
    position && 'text-black group-hover/card:bg-white group-hover/card:bg-opacity-80',
    ...etc,
  );

export const cardDragHandleIcon: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx(getSize(5), 'cursor-pointer', ...etc);

// TODO(burdon): Helper for DropdownMenu? Density, etc?
export const cardMenu: ComponentFunction<CardStyleProps & { position?: 'left' | 'right' }> = (
  { density, position },
  ...etc
) =>
  mx(
    'flex shrink-0 items-center justify-center',
    density === 'fine' ? getSize(8) : getSize(10),
    position === 'left' && 'absolute top-1 left-1',
    position === 'right' && 'absolute top-1 right-1',
    position && 'text-black group-hover/card:bg-white group-hover/card:bg-opacity-80',
    ...etc,
  );

export const cardMenuIcon: ComponentFunction<CardStyleProps> = (_, ...etc) => mx(getSize(5), 'cursor-pointer');

export const cardBody: ComponentFunction<CardStyleProps & { gutter?: boolean }> = (
  { density, gutter, noPadding },
  ...etc
) =>
  mx(
    'grow overflow-auto',
    !noPadding && 'px-2',
    // TODO(burdon): Create density-specific constants.
    gutter && (density === 'fine' ? 'pl-0 ml-[32px]' : 'pl-0 ml-[40px]'),
    ...etc,
  );

export const cardMedia: ComponentFunction<CardStyleProps & { contain?: boolean }> = ({ contain }, ...etc) =>
  mx(
    'grow max-h-[300px]',
    // Hide broken image links (e.g., if offline).
    "before:content-[' '] before:block before:w-full before:h-full before:border-0",
    contain ? 'object-contain' : 'object-cover',
    ...etc,
  );

export const cardTheme: Theme<CardStyleProps> = {
  root: cardRoot,
  header: cardHeader,
  title: cardTitle,
  dragHandle: cardDragHandle,
  dragHandleIcon: cardDragHandleIcon,
  menu: cardMenu,
  menuIcon: cardMenuIcon,
  body: cardBody,
  media: cardMedia,
};
