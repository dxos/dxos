//
// Copyright 2023 DXOS.org
//

import { type Icon } from '@phosphor-icons/react';
import type { SVGProps } from 'react';

/**
 * Serializable icon props.
 */
export type IconProps = {
  name: string;
  weights: Record<string, SVGProps<SVGPathElement>[]>;
};

/**
 * Serializable plugin defs.
 */
// TODO(burdon): Serializable.
export type PluginDef = {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  icon?: IconProps;
  Icon?: Icon; // TODO(burdon): Use Serializable data.
};
