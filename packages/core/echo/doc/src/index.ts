//
// Copyright 2025 DXOS.org
//

// Consumed as a namespace: `import * as Doc from '@dxos/doc'` → `Doc.Accessor`, `Doc.applyEdits`, etc.
export { Accessor, type Handle, type KeyPath, isValidKeyPath } from './doc';
export { type Provider, createAccessor, setProvider } from './provider';
export { type Edit, applyEdits } from './edits';
export { type Patch, append, change, diff, getHeads, getValueAt, onChange, splice } from './operations';
