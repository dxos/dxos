//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** The script compiler's WASM bundler or its TypeScript front end failed to start. */
export class CompilerError extends BaseError.extend('CompilerError', 'Compiler failed to initialize.') {}
