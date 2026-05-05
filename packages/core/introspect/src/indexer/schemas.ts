//
// Copyright 2026 DXOS.org
//

// Schema extractor.
//
// Detects ECHO-registered types — anything piped through `Type.object({ typename, version })`
// or `Type.Obj({ typename, version })`. Plain `Schema.Struct` calls without a typename are
// skipped: per spec, we capture stable, externally-referenced types, not internal building
// blocks. Walks the canonical DXOS shape:
//
//   export const Document = Schema.Struct({
//     name: Schema.optional(Schema.String),
//     content: Ref.Ref(Text.Text),
//   }).pipe(
//     Type.object({ typename: 'org.dxos.type.document', version: '0.1.0' }),
//     ...annotations
//   );
//
// What we don't do (per spec, "log and skip rather than guess"):
//
// - Resolve schemas built from runtime values (e.g. `Schema.Struct({ ...spreadFromCall() })`).
// - Follow re-exports across packages — `findSchemaUsage` is a textual scan within the same
//   set of candidate files used for symbol extraction, so cross-package references appear
//   only when the consuming file mentions the typename literally.

import { globSync } from 'glob';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  type CallExpression,
  type Node,
  type ObjectLiteralExpression,
  Project,
  ScriptTarget,
  SyntaxKind,
} from 'ts-morph';

import { formatSchemaRef } from '../refs';
import type { SchemaDetail, SchemaField, SchemaUsage, SourceLocation } from '../types';

const warn = (msg: string, err?: unknown): void => {
  console.error(err ? `[introspect schemas] ${msg}: ${String(err)}` : `[introspect schemas] ${msg}`);
};

export type SchemaExtractionInput = {
  packageName: string;
  packagePath: string;
  monorepoRoot: string;
};

export type SchemaExtraction = {
  /** ECHO-registered schemas defined in this package. */
  schemas: SchemaDetail[];
  /**
   * Broader file set used by `findSchemaUsage` — every TS source file in the
   * package, not just the ones that *define* schemas. A package that only
   * references a typename (e.g. via `Operation.invoke(SomeType, ...)` or a
   * doc comment) won't appear in the narrower extraction set, but we still
   * want its mentions surfaced as usages.
   */
  usageScanFiles: string[];
};

export const emptySchemaExtraction = (): SchemaExtraction => ({ schemas: [], usageScanFiles: [] });

/**
 * Pre-filter: schemas conventionally live under `src/types/` or are exported
 * directly from `src/index.ts`. We also accept any TS file mentioning
 * `Type.object(`, `Type.Obj(`, or `Schema.TaggedClass`. A package with none of
 * these markers is skipped without parsing anything.
 */
export const findSchemaCandidateFiles = (monorepoRoot: string, packagePath: string): string[] => {
  const srcDir = join(monorepoRoot, packagePath, 'src');
  if (!existsSync(srcDir)) {
    return [];
  }
  const candidates = new Set<string>();
  const patterns = [
    // Top-level files: most schemas live under `src/types/...`, but smaller
    // packages put them directly at `src/<Name>.ts`. The readFileSync
    // trigger-pattern check below prevents this from being expensive.
    '*.ts',
    'types/**/*.ts',
    'types.ts',
    'schema.ts',
    'schemas/**/*.ts',
    // Some packages keep schemas alongside operations / capabilities. Cheap to include.
    'operations/**/*.ts',
    'capabilities/**/*.ts',
  ];
  for (const pattern of patterns) {
    let matches: string[];
    try {
      matches = globSync(pattern, {
        cwd: srcDir,
        ignore: ['**/*.test.ts', '**/*.stories.ts', '**/__fixtures__/**', '**/__tests__/**'],
        absolute: true,
        nodir: true,
      });
    } catch {
      continue;
    }
    for (const file of matches) {
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      if (text.includes('Type.object(') || text.includes('Type.Obj(') || text.includes('Schema.TaggedClass')) {
        candidates.add(file);
      }
    }
  }
  return [...candidates];
};

/**
 * Enumerate every TS source file under a package's `src/` (test / story /
 * fixture files excluded). Used as the search space for `findSchemaUsage`,
 * which needs to surface typename mentions in any file — including packages
 * that consume schemas without defining their own.
 */
export const findUsageScanFiles = (monorepoRoot: string, packagePath: string): string[] => {
  const srcDir = join(monorepoRoot, packagePath, 'src');
  if (!existsSync(srcDir)) {
    return [];
  }
  try {
    return globSync('**/*.{ts,tsx}', {
      cwd: srcDir,
      ignore: ['**/*.test.{ts,tsx}', '**/*.stories.{ts,tsx}', '**/__fixtures__/**', '**/__tests__/**'],
      absolute: true,
      nodir: true,
    });
  } catch {
    return [];
  }
};

/**
 * Parse a package's schema-bearing files and extract every ECHO-registered type.
 * Returns the narrow set of *defining* schemas plus the broader file list used
 * for textual usage scans.
 */
export const extractSchemas = (input: SchemaExtractionInput): SchemaExtraction => {
  const { packageName, packagePath, monorepoRoot } = input;
  // Broad scan set is computed unconditionally — even if a package defines no
  // schemas, its files might *reference* one defined elsewhere.
  const usageScanFiles = findUsageScanFiles(monorepoRoot, packagePath);
  const candidateFiles = findSchemaCandidateFiles(monorepoRoot, packagePath);
  if (candidateFiles.length === 0) {
    return { schemas: [], usageScanFiles };
  }

  const project = new Project({
    useInMemoryFileSystem: false,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: {
      allowJs: false,
      target: ScriptTarget.ESNext,
      jsx: 4 /* JsxEmit.ReactJSX */,
      noEmit: true,
      skipLibCheck: true,
    },
  });

  const schemas: SchemaDetail[] = [];
  for (const filePath of candidateFiles) {
    let sourceFile;
    try {
      sourceFile = project.addSourceFileAtPathIfExists(filePath);
    } catch (err) {
      warn(`failed to load ${filePath}`, err);
      continue;
    }
    if (!sourceFile) {
      continue;
    }
    try {
      sourceFile.forEachDescendant((node) => {
        if (node.getKind() !== SyntaxKind.CallExpression) {
          return;
        }
        const call = node as CallExpression;
        const exprText = call.getExpression().getText();
        if (exprText !== 'Type.object' && exprText !== 'Type.Obj') {
          return;
        }
        const schema = readSchemaFromTypeObjectCall(call, packageName, monorepoRoot);
        if (schema) {
          schemas.push(schema);
        }
      });
    } catch (err) {
      warn(`schema walk failed in ${filePath}`, err);
    }
  }

  // Dedup by typename — same schema occasionally appears in multiple barrel files.
  // Keep the entry with the most fields (best signal that we walked the value site,
  // not a re-export).
  const byTypename = new Map<string, SchemaDetail>();
  for (const schema of schemas) {
    const existing = byTypename.get(schema.typename);
    if (!existing || schema.fields.length > existing.fields.length) {
      byTypename.set(schema.typename, schema);
    }
  }

  return {
    schemas: [...byTypename.values()].sort((a, b) => a.typename.localeCompare(b.typename)),
    usageScanFiles,
  };
};

/**
 * Given a `Type.object({ typename, version })` call, walk back through the parent
 * `.pipe(...)` chain to find the underlying `Schema.Struct({...})` definition,
 * then capture typename + version + fields + the variable name (if any).
 */
const readSchemaFromTypeObjectCall = (
  typeObjectCall: CallExpression,
  packageName: string,
  monorepoRoot: string,
): SchemaDetail | null => {
  const args = typeObjectCall.getArguments();
  if (args.length === 0 || args[0].getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return null;
  }
  const props = readObjectLiteralStringProps(args[0] as ObjectLiteralExpression);
  const typename = props.typename;
  if (!typename) {
    return null;
  }
  const version = props.version;

  // Walk up the pipe chain. `.pipe(...)` is a CallExpression whose expression is a
  // PropertyAccessExpression ending in `.pipe`. The receiver of `.pipe` is the
  // Schema.Struct(...) call (or whatever generates the schema we're enriching).
  const pipeCall = findEnclosingPipeCall(typeObjectCall);
  if (!pipeCall) {
    // Standalone Type.object(...) without a Schema.Struct context — keep typename/version
    // but report no fields rather than guessing.
    const location = nodeLocation(typeObjectCall, monorepoRoot);
    return {
      ref: formatSchemaRef(typename),
      typename,
      version,
      name: undefined,
      package: packageName,
      fieldCount: 0,
      fields: [],
      location,
    };
  }
  const receiver = (pipeCall.getExpression() as Node) // PropertyAccessExpression
    .getFirstChildByKind(SyntaxKind.CallExpression);
  let fields: SchemaField[] = [];
  let location: SourceLocation;
  if (receiver) {
    fields = readSchemaStructFields(receiver as CallExpression);
    location = nodeLocation(receiver, monorepoRoot);
  } else {
    location = nodeLocation(typeObjectCall, monorepoRoot);
  }

  return {
    ref: formatSchemaRef(typename),
    typename,
    version,
    name: findEnclosingVariableName(pipeCall) ?? undefined,
    package: packageName,
    fieldCount: fields.length,
    fields,
    location,
  };
};

const findEnclosingPipeCall = (call: CallExpression): CallExpression | undefined => {
  let cursor: Node | undefined = call.getParent();
  while (cursor) {
    if (cursor.getKind() === SyntaxKind.CallExpression) {
      const c = cursor as CallExpression;
      const expr = c.getExpression();
      if (expr.getKind() === SyntaxKind.PropertyAccessExpression && expr.getText().endsWith('.pipe')) {
        return c;
      }
    }
    cursor = cursor.getParent();
  }
  return undefined;
};

const findEnclosingVariableName = (call: CallExpression): string | null => {
  // `export const Document = Schema.Struct(...).pipe(...)` — climb to the
  // VariableDeclaration to read the name. ParenthesizedExpression / 'as const'
  // and friends sit between, so iterate parents until we either find one or
  // reach the SourceFile.
  let cursor: Node | undefined = call.getParent();
  while (cursor) {
    const kind = cursor.getKind();
    if (kind === SyntaxKind.VariableDeclaration) {
      const v = cursor as unknown as { getName: () => string };
      return v.getName();
    }
    if (kind === SyntaxKind.SourceFile) {
      return null;
    }
    cursor = cursor.getParent();
  }
  return null;
};

const readSchemaStructFields = (structCall: CallExpression): SchemaField[] => {
  // Accept any callable returning a struct shape: `Schema.Struct(...)`, `S.Struct(...)`,
  // `TypedObject({...})`, `Schema.TaggedClass<...>('Tag', {...})`. We just look at the
  // first object-literal argument; if there isn't one we give up (e.g. `Schema.Union(...)`).
  const args = structCall.getArguments();
  const literal = args.find((a) => a.getKind() === SyntaxKind.ObjectLiteralExpression) as
    | ObjectLiteralExpression
    | undefined;
  if (!literal) {
    return [];
  }
  const fields: SchemaField[] = [];
  for (const prop of literal.getProperties()) {
    if (prop.getKind() !== SyntaxKind.PropertyAssignment) {
      continue;
    }
    const pa = prop as unknown as { getName: () => string; getInitializer: () => Node | undefined };
    const name = pa.getName();
    const initializer = pa.getInitializer();
    if (!initializer) {
      continue;
    }
    const text = initializer.getText().trim();
    fields.push({
      name,
      type: shorten(text),
      optional: text.startsWith('Schema.optional(') || text.startsWith('S.optional('),
    });
  }
  return fields;
};

const shorten = (s: string): string => {
  // Field type expressions can include massive chained `.pipe(...)` annotations.
  // Keep the lead but cap at a reasonable preview to keep MCP responses bounded.
  if (s.length <= 200) {
    return s;
  }
  return `${s.slice(0, 197)}...`;
};

const readObjectLiteralStringProps = (obj: ObjectLiteralExpression): Record<string, string | undefined> => {
  const out: Record<string, string | undefined> = {};
  for (const prop of obj.getProperties()) {
    if (prop.getKind() !== SyntaxKind.PropertyAssignment) {
      continue;
    }
    const pa = prop as unknown as { getName: () => string; getInitializer: () => Node | undefined };
    const init = pa.getInitializer();
    if (!init) {
      continue;
    }
    const k = init.getKind();
    if (k === SyntaxKind.StringLiteral || k === SyntaxKind.NoSubstitutionTemplateLiteral) {
      const text = init.getText();
      out[pa.getName()] = text.slice(1, -1);
    }
  }
  return out;
};

const nodeLocation = (node: Node, monorepoRoot: string): SourceLocation => {
  const file = node.getSourceFile();
  const lc = file.getLineAndColumnAtPos(node.getStart());
  return {
    file: relative(monorepoRoot, file.getFilePath()),
    line: lc.line,
    column: lc.column,
  };
};

/**
 * Best-effort textual scan: return every line in `candidateFiles` that mentions
 * the typename string. This is intentionally low-precision — typenames are
 * URL-style strings unique enough that false positives are rare, and the cost
 * is bounded by file size, not parse depth.
 */
export const findUsages = (
  monorepoRoot: string,
  packageName: string,
  files: readonly string[],
  typename: string,
): SchemaUsage[] => {
  const usages: SchemaUsage[] = [];
  // Match the typename inside string literals OR as a substring elsewhere
  // (e.g. comments, JSON). We don't need word-boundaries because typenames
  // contain dots, which terminate identifier matching naturally.
  const needle = typename;
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (!text.includes(needle)) {
      continue;
    }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const idx = lines[i].indexOf(needle);
      if (idx < 0) {
        continue;
      }
      // Skip the *defining* line (the Type.object call) — we already report that
      // via getSchema. Heuristic: if the line contains both `typename` and
      // `Type.object`/`Type.Obj`, treat it as the definition. The caller's
      // location field is the canonical answer for "where is this defined."
      if (
        lines[i].includes('Type.object') ||
        lines[i].includes('Type.Obj') ||
        // Or the typename literally on the same line as Schema.Struct.
        false
      ) {
        continue;
      }
      usages.push({
        file: relative(monorepoRoot, file),
        package: packageName,
        line: i + 1,
        snippet: lines[i].trim().slice(0, 240),
      });
    }
  }
  return usages;
};
