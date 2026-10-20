//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import oniguruma from 'vscode-oniguruma';
import textmate, { type IGrammar, type IRawGrammar } from 'vscode-textmate';

// Both are CommonJS bundles whose exports Node cannot detect statically, so named imports fail outside vitest.
const { OnigScanner, OnigString, loadWASM } = oniguruma;
const { Registry, parseRawGrammar } = textmate;

const require = createRequire(import.meta.url);

export const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

type GrammarContribution = { scopeName: string; path: string; injectTo?: string[] };

type Manifest = { contributes: { grammars: GrammarContribution[] } };

/** The extension's own grammars, read from `package.json` so the test exercises the shipped wiring. */
export const contributedGrammars = (): GrammarContribution[] => {
  const manifest: Manifest = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  return manifest.contributes.grammars;
};

/**
 * VS Code's builtin markdown and YAML grammars, which the `.mdl` grammar includes but does not ship.
 * Literal `import.meta.resolve` specifiers, so knip sees the `tm-grammars` dependency.
 */
const BUILTIN_GRAMMARS: Record<string, string> = {
  'text.html.markdown': fileURLToPath(import.meta.resolve('tm-grammars/grammars/markdown.json')),
  'source.yaml': fileURLToPath(import.meta.resolve('tm-grammars/grammars/yaml.json')),
};

/** Path of every grammar file the `.mdl` grammar depends on, by scope. */
export const grammarPaths = (): Record<string, string> => ({
  ...Object.fromEntries(contributedGrammars().map(({ scopeName, path }) => [scopeName, join(PACKAGE_ROOT, path)])),
  ...BUILTIN_GRAMMARS,
});

/** Scopes each injection grammar targets, as VS Code derives them from `injectTo`. */
export const injections = (): Record<string, string[]> => {
  const byTarget: Record<string, string[]> = {};
  for (const { scopeName, injectTo = [] } of contributedGrammars()) {
    for (const target of injectTo) {
      (byTarget[target] ??= []).push(scopeName);
    }
  }
  return byTarget;
};

let wasmLoaded: Promise<void> | undefined;

/** Loads the `.mdl` grammar the way VS Code does: oniguruma regexes, markdown base, `mdl` fence injection. */
export const loadMdlGrammar = async (): Promise<IGrammar> => {
  wasmLoaded ??= loadWASM(readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')));
  await wasmLoaded;

  const paths = grammarPaths();
  const injectionMap = injections();
  const registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (sources) => new OnigScanner(sources),
      createOnigString: (text) => new OnigString(text),
    }),
    loadGrammar: async (scopeName): Promise<IRawGrammar | null> => {
      const path = paths[scopeName];
      return path ? parseRawGrammar(readFileSync(path, 'utf8'), path) : null;
    },
    getInjections: (scopeName) => injectionMap[scopeName],
  });

  const grammar = await registry.loadGrammar('text.html.markdown.mdl');
  if (!grammar) {
    throw new Error('text.html.markdown.mdl did not load');
  }

  return grammar;
};
