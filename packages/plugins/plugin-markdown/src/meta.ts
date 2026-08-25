//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
// Imported by package specifier, not relatively: TypeScript applies an ambient wildcard module
// declaration only to non-relative specifiers.
import descriptor from '@dxos/plugin-markdown/dxplugin.jsonc';

export const meta = Plugin.getMetaFromDescriptor(descriptor);
