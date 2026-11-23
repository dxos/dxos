//
// Copyright 2026 DXOS.org
//

import type * as Util from '@dxos/react-ui/Util';

/**
 * Plain content the inspector panel shows in a section: it never docks, scrolls or draws its own frame, since the panel
 * does all three.
 */
export type InspectorProps = Util.ThemedClassName<{
  /** Shows its values without letting them change. */
  readonly?: boolean;
}>;
