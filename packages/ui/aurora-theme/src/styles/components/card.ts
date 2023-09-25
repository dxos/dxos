//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Density, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { getSize, inputSurface } from '../fragments';

const defaults = {
  width: 'min-w-[300px] max-w-[400px]', // TODO(burdon): Defaults.
};

export type CardStyleProps = Partial<{ density: Density; square?: boolean; rounded?: boolean; noPadding?: boolean }>;

export const cardRoot: ComponentFunction<CardStyleProps> = ({ square, rounded = true }, ...etc) =>
  mx(
    'flex flex-col group overflow-hidden',
    inputSurface,
    defaults.width,
    'shadow', // TODO(burdon): Elevation?
    rounded && 'rounded',
    square && 'aspect-square',
    ...etc,
  );

export const cardHeader: ComponentFunction<CardStyleProps & { floating?: boolean }> = ({ floating }, ...etc) =>
  mx(floating ? 'relative' : 'flex w-full shrink-0 justify-between overflow-hidden items-center py-1', ...etc);

export const cardTitle: ComponentFunction<CardStyleProps & { center?: boolean; padding?: boolean }> = (
  { center, padding },
  ...etc
) => mx('grow overflow-hidden truncate', padding && 'mx-4', center && 'text-center', ...etc);

export const cardDragHandle: ComponentFunction<CardStyleProps & { position?: 'left' | 'right' }> = (
  { density, position },
  ...etc
) =>
  mx(
    'flex shrink-0 items-center justify-center',
    density === 'fine' ? getSize(8) : getSize(10),
    position === 'left' && 'absolute top-1 left-1',
    position === 'right' && 'absolute top-1 right-1',
    position && 'text-black group-hover:bg-white group-hover:bg-opacity-40',
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
    position && 'text-black group-hover:bg-white group-hover:bg-opacity-40',
    ...etc,
  );

export const cardMenuIcon: ComponentFunction<CardStyleProps> = (_, ...etc) => mx(getSize(5), 'cursor-pointer');

export const cardBody: ComponentFunction<CardStyleProps & { gutter?: boolean }> = (
  { density, gutter, noPadding },
  ...etc
) =>
  mx(
    'flex flex-col my-2',
    !noPadding && 'px-4',
    // TODO(burdon): Create density-specific constants.
    gutter && (density === 'fine' ? 'pl-0 ml-[32px]' : 'pl-0 ml-[40px]'),
    ...etc,
  );

export const cardMedia: ComponentFunction<CardStyleProps & { contain?: boolean }> = ({ contain }, ...etc) =>
  mx(
    'w-full h-full',
    // Hide broken image links (e.g., if offline).
    "before:content-[''] before:block before:w-full before:h-full before:border-0",
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
