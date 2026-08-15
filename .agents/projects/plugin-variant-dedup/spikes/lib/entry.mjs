// Shared logic for turning a `plugin.*` entry file into the set of barrel module names it
// actually registers via `Plugin.addModule` — resolving `#capabilities` import aliases and
// filtering out locally-declared inline modules (e.g. plugin-devtools' `const X = ...`).

import { findAddModuleCalls, capabilitiesImportAliasMap, capabilitiesImportedLocalNames } from './ts-util.mjs';

/**
 * @returns {Array<{kind:'ref'|'local-const'|'inline-call'|'inline-other', name:string, localName?:string, ...}>}
 */
export const classifyEntryModules = (sourceFile) => {
  if (!sourceFile) return [];
  const aliasMap = capabilitiesImportAliasMap(sourceFile);
  const importedNames = capabilitiesImportedLocalNames(sourceFile);
  return findAddModuleCalls(sourceFile).map((m) => {
    if (m.kind !== 'ref') return m;
    if (!importedNames.has(m.name)) return { ...m, kind: 'local-const' };
    return aliasMap.has(m.name) ? { ...m, localName: m.name, name: aliasMap.get(m.name) } : m;
  });
};

/** Just the barrel-export names ('ref' kind, alias-resolved) an entry file registers. */
export const refModuleNames = (sourceFile) =>
  new Set(
    classifyEntryModules(sourceFile)
      .filter((m) => m.kind === 'ref')
      .map((m) => m.name),
  );
