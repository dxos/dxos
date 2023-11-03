//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Factor out definition.

import type { ChannelValueSpec } from '@observablehq/plot';

export type Point = { x: number; y: number };

export type GeoLocation = { lat: number; lng: number };

export type Accessor<T> = (object: any) => T;

export const createAdapter = <T extends Record<string, any>>(
  prop: string,
  accessor: Accessor<T> | undefined,
): ChannelValueSpec => (accessor ? { transform: (values) => values.map((value) => accessor(value)[prop]) } : prop);
