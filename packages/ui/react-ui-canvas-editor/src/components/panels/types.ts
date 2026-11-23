//
// Copyright 2026 DXOS.org
//

import type * as Util from '@dxos/react-ui/Util';

/** A region of the canvas chrome: the tools rail, the theme and timeline bars, or the inspector panel. */
export type PanelProps = Util.ThemedClassName<{
  /** Shows its controls without letting them change the scene. */
  readonly?: boolean;
}>;
