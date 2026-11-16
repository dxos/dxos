//
// Copyright 2026 DXOS.org
//

import { DIALECTS } from './dialects.ts';

/** The CLI imports this lazily, so the namespace object a dynamic import needs stays out of the shared dialect chunk. */
export default DIALECTS;
