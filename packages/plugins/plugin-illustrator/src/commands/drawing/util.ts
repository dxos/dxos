//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** The diagram source does not compile. */
export class RenderError extends BaseError.extend('DrawingRenderError', 'The diagram does not compile.') {}

/** The drawing cannot be exported. */
export class ExportError extends BaseError.extend('DrawingExportError', 'The drawing cannot be exported.') {}
