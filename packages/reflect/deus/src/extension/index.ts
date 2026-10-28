//
// Copyright 2026 DXOS.org
//

export { mdl, mdlBlockDescription } from './language.ts';
export {
  type ChangelogEntry,
  type LintOptions,
  type MdlBlock,
  MISSING_DECISION,
  checkChangelogChange,
  duplicateSpecMessage,
  isTrivialEdit,
  lintMdl,
  missingItemMessage,
  parseChangelog,
  parseMdlBlocks,
  specReferenceFilter,
  unknownSpecMessage,
} from './check.ts';
export { mdlLint } from './lint.ts';
export { mdlComplete } from './complete.ts';
export { mdlTerms } from './syntax.ts';
export { type Dependency, type SpecRef, findSpecRefs, specDependencies } from './refs.ts';
