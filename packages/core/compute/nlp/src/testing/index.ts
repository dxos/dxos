//
// Copyright 2026 DXOS.org
//

// Import directly from `stub` (not `parse`) so the testing entrypoint stays isolated to the
// offline tagger and does not pull the live-parser/AI stack into story and test bundles.
export { stubParse } from '../stub';
