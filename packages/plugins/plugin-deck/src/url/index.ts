//
// Copyright 2026 DXOS.org
//

// The URL is the deck's only record of what is open: operations push it, the projection applies it,
// and the deck renders. `util/` holds the deck's pure helpers; this holds the machinery that reads
// and writes, plus the vocabulary that machinery is written in.

export * as Navigation from './navigation';
export * from './apply';
export * from './navigate';
export * from './project';
export * from './set-active';
