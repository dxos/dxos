//
// Copyright 2025 DXOS.org
//

import type * as Util from '@dxos/react-ui/Util';
import { type Size } from '@dxos/ui-types';

/**
 * What a spinner shows, by meaning rather than by animation, so each implementation picks its own motion for it:
 * idle and ready, working, needs attention, failed.
 */
export type ActivityState = 'ready' | 'thinking' | 'alert' | 'error';

/** The interface every spinner implements, so a host can swap one for another. */
export type SpinnerProps = Util.ThemedClassName<{
  state?: ActivityState;
  /** The spinner's square, on the theme's size scale. */
  size?: Size;
  /** One animation cycle in milliseconds, for an implementation with a fixed cycle. */
  duration?: number;
  onClick?: () => void;
}>;
