//
// Copyright 2026 DXOS.org
//

import type {
  Argument,
  CallExpression,
  Expression,
  ImportDeclaration,
  ImportSpecifier,
  NewExpression,
  Program,
} from '@oxc-project/types';
import { RolldownMagicString } from 'rolldown';
import { parseAst } from 'rolldown/parseAst';
import { Visitor } from 'rolldown/utils';

import { DEFAULT_LOG_META_TRANSFORM_SPEC, type LogMetaTransformSpec } from './definitions.ts';

/**
 * Applies meta transformations to the magic string in `code`.
 * Pass `edits` when {@link computeLogMetaEdits} was already run (e.g. Rolldown hook) to avoid recomputing.
 */
export function transform(
  code: RolldownMagicString,
  ast: Program,
  filename: string,
  options: { specs: LogMetaTransformSpec[] },
): void {
  const edits = computeLogMetaEdits(ast, code.toString(), options.specs, filename);
  const sorted = [...edits].sort((a, b) => b.pos - a.pos);
  for (const { pos, text } of sorted) {
    code.appendLeft(pos, text);
  }
}

/**
 * Self-contained log-meta transform for callers that don't already have a Rolldown
 * `meta.ast` / `meta.magicString` (e.g. esbuild-driven `dx-compile`). Parses the
 * source with the Oxc parser, runs the same edit pass as the Rolldown plugin, and
 * returns the transformed code (or `null` when nothing changed — the caller can
 * then short-circuit and reuse the original buffer).
 */
export const transformLogMeta = (
  code: string,
  filename: string,
  options: { specs?: LogMetaTransformSpec[]; lang?: 'ts' | 'tsx' | 'js' | 'jsx' } = {},
): string | null => {
  const lang = options.lang ?? langFromFilename(filename);
  if (lang === undefined) {
    return null;
  }
  const ast = parseAst(code, { astType: lang.includes('ts') ? 'ts' : 'js', lang });
  const ms = new RolldownMagicString(code);
  transform(ms, ast, filename, { specs: options.specs ?? DEFAULT_LOG_META_TRANSFORM_SPEC });
  const next = ms.toString();
  return next === code ? null : next;
};

const langFromFilename = (filename: string): 'ts' | 'tsx' | 'js' | 'jsx' | undefined => {
  if (filename.endsWith('.tsx')) {
    return 'tsx';
  }
  if (filename.endsWith('.ts')) {
    return 'ts';
  }
  if (filename.endsWith('.jsx')) {
    return 'jsx';
  }
  if (filename.endsWith('.mjs') || filename.endsWith('.cjs') || filename.endsWith('.js')) {
    return 'js';
  }
  return undefined;
};

function collectImportBindings(program: Program, specs: LogMetaTransformSpec[]): Map<string, LogMetaTransformSpec> {
  const byPackage = new Map<string, LogMetaTransformSpec[]>();
  for (const s of specs) {
    const list = byPackage.get(s.package) ?? [];
    list.push(s);
    byPackage.set(s.package, list);
  }

  const bindings = new Map<string, LogMetaTransformSpec>();

  new Visitor({
    ImportDeclaration(decl: ImportDeclaration) {
      const source = decl.source.value;
      const inPkg = byPackage.get(source);
      if (!inPkg?.length) {
        return;
      }
      const byImported = new Map(inPkg.map((sp) => [sp.name, sp]));
      for (const spec of decl.specifiers) {
        if (spec.type !== 'ImportSpecifier') {
          continue;
        }
        const sp = spec as ImportSpecifier;
        const imported = importedBindingName(sp);
        if (imported == null) {
          continue;
        }
        const rule = byImported.get(imported);
        if (rule) {
          bindings.set(sp.local.name, rule);
        }
      }
    },
  }).visit(program);

  return bindings;
}

function importedBindingName(sp: ImportSpecifier): string | null {
  const im = sp.imported;
  if (im.type === 'Identifier') {
    return im.name;
  }
  if (im.type === 'Literal' && typeof im.value === 'string') {
    return im.value;
  }
  return null;
}

function resolveSpecForCallee(
  callee: Expression,
  bindings: Map<string, LogMetaTransformSpec>,
): LogMetaTransformSpec | undefined {
  switch (callee.type) {
    case 'Identifier': {
      return bindings.get(callee.name);
    }
    case 'MemberExpression': {
      const m = callee;
      if (!m.computed && m.object.type === 'Identifier') {
        return bindings.get(m.object.name);
      }
      return undefined;
    }
    default: {
      return undefined;
    }
  }
}

function lineAtOffset(code: string, offset: number): number {
  let line = 1;
  const n = Math.min(offset, code.length);
  for (let i = 0; i < n; i++) {
    if (code.charCodeAt(i) === 10) {
      line++;
    }
  }
  return line;
}

function argumentSnippet(code: string, arg: Argument): string {
  return code.slice(arg.start, arg.end);
}

function buildMetaLiteral(options: { line: number; spec: LogMetaTransformSpec; argSnippets: string[] }): string {
  const { line, spec, argSnippets } = options;
  const parts: string[] = [`"~LogMeta":"~LogMeta"`, `F:__dxlog_file`, `L:${line}`];
  if (spec.include_scope) {
    parts.push(`S:this`);
  }
  if (spec.include_call_site) {
    parts.push(`C:(f,a)=>f(...a)`);
  }
  if (spec.include_args) {
    parts.push(`A:[${argSnippets.map((s) => JSON.stringify(s)).join(',')}]`);
  }
  return `{${parts.join(',')}}`;
}

/** True when there is a comma (ignoring whitespace) between `from` and `to` in `code`. */
function hasCommaBeforeOffset(code: string, from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    if (code[i] === ',') {
      return true;
    }
  }
  return false;
}

/** Index of `)` closing the call/new, or -1 if not found (skip transform). */
function closingParenIndex(code: string, expr: CallExpression | NewExpression): number {
  let i = expr.end - 1;
  while (i >= expr.start && code[i] !== ')') {
    i--;
  }
  return code[i] === ')' ? i : -1;
}

function buildCallInsertion(
  code: string,
  expr: CallExpression | NewExpression,
  spec: LogMetaTransformSpec,
): string | null {
  const closeParen = closingParenIndex(code, expr);
  if (closeParen < 0) {
    return null;
  }

  const args = expr.arguments;
  const hasTrailingComma = args.length > 0 && hasCommaBeforeOffset(code, args[args.length - 1].end, closeParen);
  const leadingComma = args.length > 0 && !hasTrailingComma ? ',' : '';

  // 'last' always appends meta after all user-supplied args; no padding, no skipping by arity.
  // Detection at runtime relies on the `~LogMeta` marker injected by `buildMetaLiteral`.
  if (spec.param_index === 'last') {
    const snippetsForMeta = spec.include_args ? args.map((a) => argumentSnippet(code, a)) : [];
    const meta = buildMetaLiteral({
      line: lineAtOffset(code, expr.start),
      spec,
      argSnippets: snippetsForMeta,
    });
    return leadingComma + meta;
  }

  if (spec.param_index < args.length) {
    return null;
  }

  const fillers = spec.param_index - args.length;
  const snippetsForMeta: string[] = [];
  for (const a of args) {
    snippetsForMeta.push(argumentSnippet(code, a));
  }
  for (let i = 0; i < fillers; i++) {
    snippetsForMeta.push('');
  }

  const meta = buildMetaLiteral({
    line: lineAtOffset(code, expr.start),
    spec,
    argSnippets: spec.include_args ? snippetsForMeta : [],
  });

  const slotPieces: string[] = [];
  for (let i = 0; i < fillers; i++) {
    slotPieces.push('void 0');
  }
  slotPieces.push(meta);

  return leadingComma + slotPieces.join(',');
}

/** After hashbang and any leading `import` declarations (valid ESM). */
export function preambleInsertIndex(program: Program): number {
  let pos = 0;
  if (program.hashbang) {
    pos = program.hashbang.end;
  }
  for (const stmt of program.body) {
    if (stmt.type === 'ImportDeclaration') {
      pos = stmt.end;
    } else {
      break;
    }
  }
  return pos;
}

export interface LogMetaEdit {
  /** UTF-16 offset in original source. */
  pos: number;
  text: string;
}

/**
 * Computes text insertions for `__dxlog_file` + per-call metadata (same semantics as the SWC plugin).
 * Uses {@link https://rolldown.rs/apis/javascript-api#utilities | `Visitor` from `rolldown/utils`} to traverse the Oxc AST.
 */
export function computeLogMetaEdits(
  program: Program,
  code: string,
  specs: LogMetaTransformSpec[],
  displayPath: string,
): LogMetaEdit[] {
  if (specs.length === 0) {
    return [];
  }

  const bindings = collectImportBindings(program, specs);
  if (bindings.size === 0) {
    return [];
  }

  const edits: LogMetaEdit[] = [];
  const preambleAt = preambleInsertIndex(program);
  edits.push({
    pos: preambleAt,
    text: `${preambleAt > 0 && code[preambleAt - 1] !== '\n' ? '\n' : ''}var __dxlog_file=${JSON.stringify(displayPath)};\n`,
  });

  new Visitor({
    CallExpression(call: CallExpression) {
      const spec = resolveSpecForCallee(call.callee, bindings);
      if (!spec) {
        return;
      }
      const ins = buildCallInsertion(code, call, spec);
      if (ins == null) {
        return;
      }
      const idx = closingParenIndex(code, call);
      if (idx >= 0) {
        edits.push({ pos: idx, text: ins });
      }
    },
    NewExpression(ne: NewExpression) {
      const spec = resolveSpecForCallee(ne.callee, bindings);
      if (!spec) {
        return;
      }
      const ins = buildCallInsertion(code, ne, spec);
      if (ins == null) {
        return;
      }
      const idx = closingParenIndex(code, ne);
      if (idx >= 0) {
        edits.push({ pos: idx, text: ins });
      }
    },
  }).visit(program);

  return edits;
}
