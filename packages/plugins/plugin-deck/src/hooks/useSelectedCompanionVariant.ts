//
// Copyright 2026 DXOS.org
//

import { useViewState } from '@dxos/react-ui-attention';

import { COMPANION_VIEW_STATE_CONTEXT, companionAspect } from '../util';

/**
 * Reads the globally-selected companion variant (persisted via view state) so reopening the companion
 * restores the last-selected tab rather than resetting to the first.
 */
export const useSelectedCompanionVariant = (): string | undefined =>
  useViewState(companionAspect, COMPANION_VIEW_STATE_CONTEXT).variant;
