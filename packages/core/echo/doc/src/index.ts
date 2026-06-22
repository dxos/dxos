//
// Copyright 2025 DXOS.org
//

export { DocAccessor, type IDocHandle, type KeyPath, isValidKeyPath } from './accessor';
export { type DocAccessorProvider, createDocAccessor, setProvider } from './provider';
export { type Edit, applyEdits } from './edits';
export { type Patch, append, change, diff, getHeads, getValueAt, onChange, splice } from './operations';
