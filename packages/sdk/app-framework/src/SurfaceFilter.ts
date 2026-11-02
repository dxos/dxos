//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Headless counterpart of `Surface`, for modules (such as role and filter definitions read by `dx.config.ts`)
// that must not load React.
export { type Binding, type Filter, isFilter, makeFilter } from './ui/components/Surface/types.ts';
