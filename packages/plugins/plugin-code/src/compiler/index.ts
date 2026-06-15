//
// Copyright 2026 DXOS.org
//

export { Compiler, type Diagnostic, type DiagnosticSeverity } from './compiler';
export { getCompiler, resetCompiler } from './singleton';
export {
  compileEntry,
  executeScript,
  ENTRY_CANDIDATES,
  type BuildResult,
  type LoadedFile,
  type RunResult,
} from './build';
export { bundleEntry, ensureEsbuild, needsBundling, type BundleResult } from './bundle';
