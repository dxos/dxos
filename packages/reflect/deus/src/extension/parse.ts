//
// Copyright 2026 DXOS.org
//

// The parsing, lint and completion logic without CodeMirror, for tools that run outside an editor view (the language server).
export {
  BLOCK_HEADER_LINE,
  type BlockHeader,
  type FenceLine,
  type MdlBlock,
  extensionTerms,
  parseBlockHeaders,
  parseMdlBlocks,
  scanFenceLines,
} from './blocks.ts';
export {
  type ChangelogEntry,
  type LintOptions,
  MISSING_DECISION,
  checkChangelogChange,
  duplicateSpecMessage,
  isTrivialEdit,
  lintMdl,
  missingItemMessage,
  parseChangelog,
  specReferenceFilter,
  unknownSpecMessage,
} from './check.ts';
export { BLOCK_FIELDS, fieldCompletionContext } from './completion.ts';
export { BLOCK_TYPES } from './constants.ts';
export { type Dependency, type SpecRef, findSpecKeys, findSpecRefs, scanSpecLines, specDependencies } from './refs.ts';
