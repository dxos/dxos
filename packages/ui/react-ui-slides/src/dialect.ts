//
// Copyright 2026 DXOS.org
//

// The slide dialect on its own: how a slide's markdown is read, written and themed, with nothing that renders it.
// A module that only reads slides — a schema, a migration, an operation — takes this rather than the root barrel,
// which reaches the renderer and so React and the syntax highlighter.

export * from './markdown/index.ts';
export * as SlideTheme from './SlideTheme.ts';
