//
// Copyright 2026 DXOS.org
//

import { type ClipKind } from '../clip/types';

/**
 * Result of a user interaction with the picker. The click resolves with
 * either a picked element + kind, or `cancelled` when the user hits Esc.
 */
export type PickerResult = { status: 'picked'; element: Element; kind: ClipKind } | { status: 'cancelled' };
