//
// Copyright 2026 DXOS.org
//

// Inlined from tools/vite-plugin-log to avoid a circular workspace dependency
// (dx-tsdown → vite-plugin-log → @dxos/log → [ts-build] → dx-tsdown).
// Only external packages (rolldown, @oxc-project/types) are used here.

import type {
  Argument,
  CallExpression,
  Expression,
  ImportDeclaration,
  ImportSpecifier,
  NewExpression,
  Program,
} from '@oxc-project/types';
import { RolldownMagicString, type RolldownPlugin } from 'rolldown';
import { parseAst } from 'rolldown/parseAst';
import { Visitor } from 'rolldown/utils';

export interface LogMetaTransformSpec {
  name: string;
  package: string;
  param_index: number | 'last';
  include_args: boolean;
  include_call_site: boolean;
  include_scope: boolean;
}

export interface LogMetaTransformOptions {
  filename?: string;
  to_transform: LogMetaTransformSpec[];
  excludeId?: RegExp;
}

export const DEFAULT_LOG_META_TRANSFORM_SPEC: LogMetaTransformSpec[] = [
  {
    name: 'log',
    package: '@dxos/log',
    param_index: 2,
    include_args: false,
    include_call_site: false,
    include_scope: true,
  },
  {
    name: 'dbg',
    package: '@dxos/log',
    param_index: 1,
    include_args: true,
    include_call_site: false,
    include_scope: false,
  },
  {
    name: 'invariant',
    package: '@dxos/invariant',
    param_index: 2,
    include_args: true,
    include_call_site: false,
    include_scope: true,
  },
  {
    name: 'Context',
    package: '@dxos/context',
    param_index: 1,
    include_args: false,
    include_call_site: false,
    include_scope: false,
  },
];

// eslint-disable-next-line no-control-regex
const LOG_META_EXCLUDE_ID_DEFAULT = /node_modules|\0/;

const ROLLDOWN_LOG_META_PLUGIN_NAME = 'dxos:rolldown-log-meta';

export function rolldownLogMetaPlugin(options: LogMetaTransformOptions): RolldownPlugin {
  return {
    name: ROLLDOWN_LOG_META_PLUGIN_NAME,
    transform: {
      order: 'pre' as const,
      handler(code: string, id: string, meta: { moduleType: string; magicString?: RolldownMagicString }) {
        const excludeId = options.excludeId ?? LOG_META_EXCLUDE_ID_DEFAULT;
        if (excludeId instanceof RegExp && excludeId.test(id)) {
          return null;
        }
        const lang = meta.moduleType as 'ts' | 'tsx' | 'js' | 'jsx';
        if (!['js', 'jsx', 'ts', 'tsx'].includes(lang)) {
          return null;
        }
        // Always parse from source and build a fresh MagicString so positions
        // are consistent. rolldown's meta.ast / meta.magicString may represent
        // pre-transformed (e.g. type-stripped) code whose byte offsets diverge
        // from the original TypeScript in `code`, producing wrong insertion points.
        const ast = parseAst(code, { astType: lang.includes('ts') ? 'ts' : 'js', lang });
        const ms = new RolldownMagicString(code);
        applyTransform(ms, ast, options.filename ?? id, { specs: options.to_transform });
        return { code: ms.toString() };
      },
    },
  } satisfies RolldownPlugin;
}

function applyTransform(
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

function hasCommaBeforeOffset(code: string, from: number, to: number): boolean {
  for (let i = from; i < to; i++) {
    if (code[i] === ',') {
      return true;
    }
  }
  return false;
}

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

function preambleInsertIndex(program: Program): number {
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

interface LogMetaEdit {
  pos: number;
  text: string;
}

function computeLogMetaEdits(
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

// Unused here but exported so the inlined copy matches its original surface.
export const transformLogMeta = (
  code: string,
  filename: string,
  options: { specs?: LogMetaTransformSpec[]; lang?: 'ts' | 'tsx' | 'js' | 'jsx' } = {},
): string | null => {
  const langFromFilename = (fn: string): 'ts' | 'tsx' | 'js' | 'jsx' | undefined => {
    if (fn.endsWith('.tsx')) {
      return 'tsx';
    }
    if (fn.endsWith('.ts')) {
      return 'ts';
    }
    if (fn.endsWith('.jsx')) {
      return 'jsx';
    }
    if (fn.endsWith('.mjs') || fn.endsWith('.cjs') || fn.endsWith('.js')) {
      return 'js';
    }
    return undefined;
  };
  const lang = options.lang ?? langFromFilename(filename);
  if (lang === undefined) {
    return null;
  }
  const ast = parseAst(code, { astType: lang.includes('ts') ? 'ts' : 'js', lang });
  const ms = new RolldownMagicString(code);
  applyTransform(ms, ast, filename, { specs: options.specs ?? DEFAULT_LOG_META_TRANSFORM_SPEC });
  const next = ms.toString();
  return next === code ? null : next;
};
