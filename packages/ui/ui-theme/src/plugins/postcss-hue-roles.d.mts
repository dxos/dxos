//
// Copyright 2026 DXOS.org
//

import { type Plugin } from 'postcss';

/** Expands the `@dx-hue-*` directives in styles.css into `--color-<hue>-<role>` tokens. */
declare const dxHueRoles: () => Plugin;

export default dxHueRoles;
