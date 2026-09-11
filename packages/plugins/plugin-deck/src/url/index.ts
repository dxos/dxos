//
// Copyright 2026 DXOS.org
//

// The URL is the deck's only record of what is open: operations push it, the projection applies it,
// and the deck renders. `util/` holds the deck's pure helpers; this holds the machinery that reads
// and writes, plus the vocabulary that machinery is written in.

export * as Navigation from './navigation.ts';
export * from './apply.ts';
export * from './navigate.ts';
export * from './project.ts';
export * from './set-active.ts';
