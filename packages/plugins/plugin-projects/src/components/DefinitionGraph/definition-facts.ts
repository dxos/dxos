//
// Copyright 2026 DXOS.org
//

import { type ProjectCapabilities } from '#types';

/** A fact on a card: the field, its value as written, and its style when the value is a known one. */
export type CardFact = { field: string; value: string; style?: ProjectCapabilities.FactStyle };
