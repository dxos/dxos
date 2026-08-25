//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
// Imported by package specifier, not relatively: TypeScript applies an ambient wildcard module
// declaration only to non-relative specifiers.
import descriptor from '@dxos/plugin-markdown/dxplugin.jsonc';

// Derived from the default export rather than re-exporting the loader's `meta`, because a host that
// reads the raw JSONC — the bun-compiled CLI — has only the data, and a named re-export of an export
// that does not exist there is a load-time SyntaxError.
export const meta = Plugin.getMetaFromDescriptor(descriptor);
