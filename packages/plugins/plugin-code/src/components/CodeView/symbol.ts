//
// Copyright 2026 DXOS.org
//

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Declarations, most specific first: a top-level declaration beats a member, which beats a bare mention. */
const declarationPatterns = (name: string): RegExp[] => {
  const id = escape(name);
  return [
    new RegExp(
      `^\\s*(?:export\\s+)?(?:default\\s+)?(?:declare\\s+)?(?:abstract\\s+)?(?:async\\s+)?(?:class|interface|type|enum|function\\*?|const|let|var|namespace)\\s+${id}\\b`,
    ),
    new RegExp(
      `^\\s*(?:(?:public|private|protected|static|readonly|override|async|get|set|#)\\s*)*${id}\\s*(?:\\??[:(<=])`,
    ),
    new RegExp(`\\b${id}\\b`),
  ];
};

/**
 * The 1-based line that declares a symbol in a source file, or undefined when it is not there. A dotted name
 * (`Spec.make`, `Class.method`) finds the outer declaration first and then the member after it.
 */
export const findSymbolLine = (content: string, symbol: string): number | undefined => {
  const lines = content.split('\n');
  let start = 0;
  let found: number | undefined;
  for (const [index, part] of symbol.split('.').entries()) {
    found = undefined;
    const [declaration, member, mention] = declarationPatterns(part);
    // After the owner, a member is what the dotted name means; a later top-level namesake is not.
    for (const pattern of index === 0 ? [declaration, member, mention] : [member, declaration, mention]) {
      const index = lines.findIndex((line, number) => number >= start && pattern.test(line));
      if (index >= 0) {
        found = index;
        break;
      }
    }
    if (found === undefined) {
      return undefined;
    }
    start = found + 1;
  }
  return found === undefined ? undefined : found + 1;
};
