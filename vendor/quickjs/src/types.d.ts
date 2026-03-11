//
// Copyright 2026 DXOS.org
//

export * from 'quickjs-emscripten';

import { QuickJSWASMModule } from 'quickjs-emscripten';

export declare function createQuickJS(): Promise<QuickJSWASMModule>;
