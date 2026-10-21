//
// Copyright 2026 DXOS.org
//

import { formatValue } from './describe.ts';

/** Printed form of a value: strings verbatim, everything else as {@link formatValue} renders it. */
export const formatPrinted = (value: unknown): string => formatValue(value);
