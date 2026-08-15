// Shared TypeScript compiler-API helpers for the capability-barrel spike.
//
// No fancy deps: resolves the `typescript` package straight out of the pnpm store the way the
// task instructions suggested, and does its own light AST walking (no ts-morph).

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ts = require(require.resolve('typescript', { paths: ['/home/user/dxos/tools/dx-trace-imports'] }));

export { ts };

/** Parse a file into a ts.SourceFile, or null if it doesn't exist. */
export const parseFile = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const text = fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, /* setParentNodes */ true, ts.ScriptKind.TSX);
};

/** Full source text of a node, as written (not re-printed). */
export const nodeText = (sourceFile, node) => sourceFile.text.slice(node.getStart(sourceFile), node.getEnd());

/**
 * Render the full flattened text of a member-access chain, e.g. `AppCapability.schema` or
 * `Plugin.addModule`. Falls back to the raw node text for anything more exotic.
 */
export const calleeText = (sourceFile, expr) => {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) {
    return `${calleeText(sourceFile, expr.expression)}.${expr.name.text}`;
  }
  return nodeText(sourceFile, expr);
};

/**
 * Given the leading comment ranges attached to a statement (JSDoc + line/block comments directly
 * above it), return the statement's text including those comments — this is what the generator
 * slices verbatim into the generated barrels.
 */
export const statementTextWithLeadingComments = (sourceFile, statement) => {
  const fullStart = statement.getFullStart();
  const start = statement.getStart(sourceFile);
  const leading = sourceFile.text.slice(fullStart, start);
  // Trim leading blank lines but keep the comment block itself, then reattach with the same
  // whitespace pattern the generator wants (a single blank line before each export).
  const trimmedLeading = leading.replace(/^\s*\n+/, '');
  const body = sourceFile.text.slice(start, statement.getEnd());
  return (trimmedLeading + body).trimEnd();
};

/** Collect all `export const NAME = ...` (and `export const NAME: T = ...`) at top level. */
export const topLevelExportConsts = (sourceFile) => {
  const out = [];
  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    const isExported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!isExported) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      out.push({ name: decl.name.text, statement: stmt, declaration: decl, initializer: decl.initializer });
    }
  }
  return out;
};

/** Collect `export * from '...'` and `export { A, B as C } from '...'` / local re-exports. */
export const topLevelExportDeclarations = (sourceFile) => {
  const out = [];
  for (const stmt of sourceFile.statements) {
    if (!ts.isExportDeclaration(stmt)) continue;
    const moduleSpecifier =
      stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null;
    if (stmt.exportClause === undefined) {
      // export * from '...'
      out.push({ kind: 'star', moduleSpecifier, statement: stmt });
    } else if (ts.isNamedExports(stmt.exportClause)) {
      const isTypeOnly = stmt.isTypeOnly;
      for (const el of stmt.exportClause.elements) {
        out.push({
          kind: 'named',
          isTypeOnly: isTypeOnly || el.isTypeOnly,
          localName: (el.propertyName ?? el.name).text,
          exportedName: el.name.text,
          moduleSpecifier,
          statement: stmt,
        });
      }
    }
  }
  return out;
};

/** Resolve a relative import specifier (no extension, or a directory) to an actual file on disk. */
export const resolveRelativeModule = (fromDir, spec) => {
  if (!spec.startsWith('.')) return null; // not a relative import — can't resolve without package resolution
  const base = path.resolve(fromDir, spec);
  const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

/**
 * Find every `Plugin.addModule(ARG)` call inside a `Plugin.define(...).pipe(...)` chain and
 * classify ARG:
 *  - identifier ref into `#capabilities`               -> {kind:'ref', name}
 *  - call expression like `AppCapability.translations(...)` or `AppCapability.pluginAsset(...)`
 *    -> {kind:'inline-call', name: <rightmost callee segment>, calleeText, argsText}
 *  - anything else (arrow fn, etc.)                     -> {kind:'inline-other', name: 'inline@<line>', text}
 */
export const findAddModuleCalls = (sourceFile) => {
  const results = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'addModule' &&
      calleeText(sourceFile, node.expression.expression) === 'Plugin'
    ) {
      const arg = node.arguments[0];
      results.push(classifyAddModuleArg(sourceFile, arg));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return results;
};

const classifyAddModuleArg = (sourceFile, arg) => {
  const line = sourceFile.getLineAndCharacterOfPosition(arg.getStart(sourceFile)).line + 1;
  if (ts.isIdentifier(arg)) {
    return { kind: 'ref', name: arg.text, line };
  }
  if (ts.isCallExpression(arg)) {
    const callee = calleeText(sourceFile, arg.expression);
    const segments = callee.split('.');
    const name = segments[segments.length - 1];
    return {
      kind: 'inline-call',
      name,
      calleeText: callee,
      argsText: arg.arguments.map((a) => nodeText(sourceFile, a)).join(', '),
      line,
    };
  }
  return { kind: 'inline-other', name: `inline@${line}`, text: nodeText(sourceFile, arg).slice(0, 120), line };
};

/**
 * Map each locally-bound name imported from `#capabilities` back to the name it was exported
 * under in the barrel — handles `import { X as Y } from '#capabilities'` aliasing (plugin-assistant
 * imports `AiContext as AiContextCapability`, so the `addModule` call site only ever sees the
 * local alias, not the barrel's real export name).
 */
export const capabilitiesImportAliasMap = (sourceFile, specifier = '#capabilities') => {
  const map = new Map();
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier) || stmt.moduleSpecifier.text !== specifier) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) {
        map.set(el.name.text, (el.propertyName ?? el.name).text);
      }
    }
  }
  return map;
};

/** Set of local names bound by `import { ... } from '#capabilities'` (post-alias local names). */
export const capabilitiesImportedLocalNames = (sourceFile, specifier = '#capabilities') => {
  const names = new Set();
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier) || stmt.moduleSpecifier.text !== specifier) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) names.add(el.name.text);
    }
  }
  return names;
};

/**
 * Every top-level `import ...` declaration in a file, as {text, boundNames} — `boundNames` is
 * every local identifier the statement binds (default / namespace / named, alias-resolved).
 */
export const topLevelImportDeclarations = (sourceFile) => {
  const out = [];
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue;
    const boundNames = new Set();
    const clause = stmt.importClause;
    if (clause.name) boundNames.add(clause.name.text); // default import
    if (clause.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        boundNames.add(clause.namedBindings.name.text); // `import * as X`
      } else if (ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements) boundNames.add(el.name.text);
      }
    }
    out.push({ text: nodeText(sourceFile, stmt), boundNames });
  }
  return out;
};

/**
 * Free identifiers referenced in a snippet of TS source (re-parsed standalone — a single
 * `export const X = ...;` statement is valid on its own). Skips member-access property names and
 * non-computed object/type-literal keys so `AppCapability.schema` doesn't register `schema` as a
 * free identifier, but otherwise over-collects liberally (parameter names, etc.) — harmless,
 * since callers only use this set to test membership against *known* import bindings.
 */
export const collectFreeIdentifiers = (snippet) => {
  const sf = ts.createSourceFile('snippet.tsx', snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set();
  const isSkippedIdentifier = (node) => {
    const parent = node.parent;
    if (!parent) return false;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true;
    if (
      (ts.isPropertyAssignment(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isMethodDeclaration(parent) ||
        ts.isMethodSignature(parent)) &&
      parent.name === node &&
      !parent.computedPropertyName
    ) {
      return true;
    }
    return false;
  };
  const visit = (node) => {
    if (ts.isIdentifier(node) && !isSkippedIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
};

/** Parse a plugin's package.json and return its `imports` map (may be {}). */
export const readPackageImports = (pluginDir) => {
  const pkgPath = path.join(pluginDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return {};
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.imports ?? {};
};

/**
 * For a conditional-exports style entry (`imports['#capabilities']` / `imports['#plugin']`),
 * figure out which source file each of browser/node/workerd actually resolves to.
 */
export const resolveConditionalImport = (pluginDir, importsMap, key) => {
  const entry = importsMap[key];
  if (!entry) return { browser: null, node: null, workerd: null };
  const src = entry.source ?? entry; // some entries might not be conditional at all
  if (typeof src === 'string') {
    const resolved = path.resolve(pluginDir, src);
    return { browser: resolved, node: resolved, workerd: resolved };
  }
  const toAbs = (p) => (p ? path.resolve(pluginDir, p) : null);
  return {
    browser: toAbs(src.default ?? src.browser ?? null),
    node: toAbs(src.node ?? src.default ?? null),
    workerd: toAbs(src.workerd ?? src.default ?? null),
    hasDedicatedNode: Boolean(src.node),
    hasDedicatedWorkerd: Boolean(src.workerd),
  };
};
