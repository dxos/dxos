//
// Copyright 2026 DXOS.org
//

import { classnames } from './classnames.ts';
import { emphasis } from './emphasis.ts';
import { imports } from './imports.ts';
import { layout } from './layout.ts';
import { renames } from './renames.ts';
import { theme } from './theme.ts';
import { type Transform } from './transform.ts';

export { classnames, emphasis, imports, layout, renames, theme };
export { TEXT_EMPHASIS_RENAMES, createEmphasisTransform, renameClasses } from './emphasis.ts';
export type { Transform } from './transform.ts';

/** Every transform in the order `all` runs them: renames read current part names, imports run last. */
export const TRANSFORMS: Transform[] = [renames, layout, theme, classnames, emphasis, imports];
