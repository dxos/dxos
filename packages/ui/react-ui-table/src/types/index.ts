//
// Copyright 2025 DXOS.org
//

// A UI-free entrypoint: the Table schema with no React attached, so operation handlers and node
// plugin variants can use it without pulling the table components.
// TODO(wittjosiah): Factor this out into a package that does not carry a UI dependency at all.

export * as Table from './Table';
