//
// Copyright 2023 DXOS.org
//

import { ComponentPropsWithoutRef } from 'react';

import { DocumentBase } from '@dxos/echo-schema';

export interface TileSlots {
  root?: ComponentPropsWithoutRef<'div'>;
  label?: ComponentPropsWithoutRef<'h2'>;
}

export interface TileProps<T = DocumentBase> {
  tile: T;
  slots?: TileSlots;
}
