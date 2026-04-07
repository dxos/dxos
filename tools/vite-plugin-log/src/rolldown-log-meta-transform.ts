//
// Copyright 2026 DXOS.org
//

import type { Argument, CallExpression, Expression, ImportDeclaration, ImportSpecifier, NewExpression, Program } from '@oxc-project/types';
import { Visitor } from 'rolldown/utils';

import type { LogMetaTransformSpec } from './rolldown-log-meta-types';

export function collectImportBindings(
  program: Program,
  specs: LogMetaTransformSpec[],
): Map<string, LogMetaTransformSpec> {
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

function resolveSpecForCallee(callee: Expression, bindings: Map<string, LogMetaTransformSpec>): LogMetaTransformSpec | undefined {
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

function buildMetaLiteral(options: {
  line: number;
  spec: LogMetaTransformSpec;
  argSnippets: string[];
}): string {
  const { line, spec, argSnippets } = options;
  const parts: string[] = [`F:__dxlog_file`, `L:${line}`];
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

/** Index of `)` closing the call/new, or -1 if not found (skip transform). */
function closingParenIndex(code: string, expr: CallExpression | NewExpression): number {
  let i = expr.end - 1;
  while (i >= expr.start && code[i] !== ')') {
    i--;
  }
  return code[i] === ')' ? i : -1;
}

function buildCallInsertion(code: string, expr: CallExpression | NewExpression, spec: LogMetaTransformSpec): string | null {
  if (closingParenIndex(code, expr) < 0) {
    return null;
  }

  const args = expr.arguments;
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
  const tail = slotPieces.join(',');
  return (args.length > 0 ? ',' : '') + tail;
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
export function computeLogMetaEdits(program: Program, code: string, specs: LogMetaTransformSpec[], displayPath: string): LogMetaEdit[] {
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
