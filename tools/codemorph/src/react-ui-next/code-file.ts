//
// Copyright 2026 DXOS.org
//

import ts from '@typescript/typescript6';

import { type Edit, applyEdits, lineRange } from './edits.ts';
import { type Residue } from './report.ts';
import { type Form, MODULES, type PackageName, packageOf } from './targets.ts';

/** A local name bound by an import from one of the migrated packages. */
export type Binding = {
  local: string;
  /** The exported name, or `*` for a namespace import. */
  imported: string;
  pkg: PackageName;
  form: Form;
  typeOnly: boolean;
  declaration: ts.ImportDeclaration;
  specifier?: ts.ImportSpecifier;
};

/** What a JSX tag or member expression refers to, independent of how the file spells it. */
export type Identity = {
  pkg: PackageName;
  form: Form;
  /** Export path from the package's root: `['Panel', 'Toolbar']`, whether written `Panel.Toolbar` or `Next.Panel.Toolbar`. */
  path: string[];
  /** The binding the expression starts with. */
  binding: Binding;
};

type JsxElementLike = ts.JsxElement | ts.JsxSelfClosingElement;

/** A JSX element whose tag resolves to a migrated package. */
export type Element = {
  node: JsxElementLike;
  opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement;
  closing?: ts.JsxClosingElement;
  identity: Identity;
};

const DECLARATION_KINDS = new Set([
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.Parameter,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.TypeParameter,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.BindingElement,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ClassExpression,
]);

const NAME_KINDS = new Set([
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.PropertySignature,
  ts.SyntaxKind.PropertyDeclaration,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.EnumMember,
  ts.SyntaxKind.JsxAttribute,
  ts.SyntaxKind.LabeledStatement,
]);

const isNameOf = (node: ts.Node, id: ts.Identifier) => 'name' in node && node.name === id;

type IdentifierRole = 'reference' | 'declaration' | 'import' | 'export' | 'name';

const roleOf = (id: ts.Identifier): IdentifierRole => {
  const parent = id.parent;
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) {
    return 'import';
  }
  if (ts.isExportSpecifier(parent)) {
    return parent.propertyName === id || !parent.propertyName ? 'export' : 'name';
  }
  if (ts.isPropertyAccessExpression(parent) && parent.name === id) {
    return 'name';
  }
  if (ts.isQualifiedName(parent) && parent.right === id) {
    return 'name';
  }
  if (ts.isBindingElement(parent) && parent.propertyName === id) {
    return 'name';
  }
  if (NAME_KINDS.has(parent.kind) && isNameOf(parent, id)) {
    return 'name';
  }
  if (DECLARATION_KINDS.has(parent.kind) && isNameOf(parent, id)) {
    return 'declaration';
  }
  return 'reference';
};

/** The identifiers of a dotted expression (`a.b.c`), or undefined when it is not a plain chain. */
const chainOf = (node: ts.Node): ts.Identifier[] | undefined => {
  if (ts.isIdentifier(node)) {
    return [node];
  }
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
    const head = chainOf(node.expression);
    return head ? [...head, node.name] : undefined;
  }
  return undefined;
};

type PendingImport = { module: string; name: string; local: string; typeOnly: boolean; anchor?: ts.ImportDeclaration };

/** One source file under transformation: its import bindings, the edits so far, and its residue. */
export class CodeFile {
  readonly sourceFile: ts.SourceFile;
  readonly bindings = new Map<string, Binding>();
  readonly residue: Residue[] = [];
  readonly counts: Record<string, number> = {};

  readonly #edits: Edit[] = [];
  readonly #identifiers = new Map<string, ts.Identifier[]>();
  /** References of each local that edits removed. */
  readonly #released = new Map<string, number>();
  readonly #removedSpecifiers = new Set<ts.ImportSpecifier>();
  readonly #pending: PendingImport[] = [];
  readonly #upgraded = new Set<ts.ImportSpecifier>();
  readonly #claimed: { start: number; end: number }[] = [];

  readonly fileName: string;
  readonly text: string;
  readonly transform: string;
  /** Transforms that already ran on this text in the same run. */
  readonly ran: string[];

  constructor(fileName: string, text: string, transform: string, ran: string[] = []) {
    this.ran = ran;
    this.fileName = fileName;
    this.text = text;
    this.transform = transform;
    this.sourceFile = ts.createSourceFile(
      fileName,
      text,
      ts.ScriptTarget.Latest,
      true,
      fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    this.#readBindings();
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        const list = this.#identifiers.get(node.text) ?? [];
        list.push(node);
        this.#identifiers.set(node.text, list);
      }
      ts.forEachChild(node, visit);
    };
    visit(this.sourceFile);
  }

  //
  // Edits and reporting.
  //

  get changed() {
    return this.#edits.length > 0 || this.#pending.length > 0 || this.#removedSpecifiers.size > 0;
  }

  edit(start: number, end: number, text: string) {
    this.#edits.push({ start, end, text });
  }

  replace(node: ts.Node, text: string) {
    this.edit(node.getStart(this.sourceFile), node.getEnd(), text);
  }

  /** Removes a node, and its line when nothing else is on it. */
  remove(node: ts.Node) {
    const range = lineRange(this.text, node.getStart(this.sourceFile), node.getEnd());
    this.edit(range.start, range.end, '');
  }

  /** Marks a node as rebuilt from its source text, so later edits inside it are skipped. */
  claim(node: ts.Node) {
    this.#claimed.push({ start: node.getStart(this.sourceFile), end: node.getEnd() });
  }

  isClaimed(node: ts.Node): boolean {
    const start = node.getStart(this.sourceFile);
    return this.#claimed.some((range) => start >= range.start && node.getEnd() <= range.end);
  }

  count(rule: string, by = 1) {
    this.counts[rule] = (this.counts[rule] ?? 0) + by;
  }

  report(node: ts.Node, reason: string) {
    const start = node.getStart(this.sourceFile);
    const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
    const snippet = node.getText(this.sourceFile).replace(/\s+/g, ' ');
    this.residue.push({
      transform: this.transform,
      file: this.fileName,
      line: line + 1,
      column: character + 1,
      reason,
      snippet: snippet.length > 120 ? `${snippet.slice(0, 117)}...` : snippet,
    });
  }

  /** The transformed text, with import declarations rewritten for every name added, moved or no longer used. */
  finish(): string {
    this.#finishImports();
    return applyEdits(this.text, this.#edits);
  }

  //
  // Bindings and references.
  //

  /** Identifiers that read the local binding `name` (JSX tags, values, types, member roots). */
  references(name: string): ts.Identifier[] {
    return (this.#identifiers.get(name) ?? []).filter((id) => {
      const role = roleOf(id);
      return role === 'reference' || role === 'export';
    });
  }

  /** Whether `name` is also declared in the file (a parameter, variable, type, …), so a rename by text is unsafe. */
  isShadowed(name: string): boolean {
    return (this.#identifiers.get(name) ?? []).some((id) => roleOf(id) === 'declaration');
  }

  /** Records that edits removed `by` references of `local`, so its import can go once none remain. */
  release(local: string, by = 1) {
    this.#released.set(local, (this.#released.get(local) ?? 0) + by);
  }

  /** Drops an import specifier outright (its references were rewritten elsewhere). */
  removeSpecifier(specifier: ts.ImportSpecifier) {
    this.#removedSpecifiers.add(specifier);
  }

  /** Resolves a tag or member expression to the migrated export it names. */
  resolve(node: ts.Node): Identity | undefined {
    const chain = chainOf(node);
    if (!chain) {
      return undefined;
    }
    const binding = this.bindings.get(chain[0].text);
    if (!binding) {
      return undefined;
    }
    const rest = chain.slice(1).map((id) => id.text);
    const namespaced =
      binding.imported === '*' || (binding.form === 'next' && binding.imported === MODULES[binding.pkg].namespace);
    const path = namespaced ? rest : [binding.imported, ...rest];
    return path.length > 0 ? { pkg: binding.pkg, form: binding.form, path, binding } : undefined;
  }

  /** Every JSX element whose tag resolves to a migrated package, outermost first. */
  elements(): Element[] {
    const result: Element[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node;
        const identity = this.resolve(opening.tagName);
        if (identity) {
          result.push({ node, opening, closing: ts.isJsxElement(node) ? node.closingElement : undefined, identity });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(this.sourceFile);
    return result;
  }

  /**
   * The expression that names `path` of `pkg` in `form`, adding the import it needs.
   * Reuses an existing binding, so a file keeps its own spelling (`Next.Button` or a named `Button`).
   */
  nameFor(pkg: PackageName, form: Form, path: string[], { typeOnly = false }: { typeOnly?: boolean } = {}): string {
    const target = MODULES[pkg];
    const module = form === 'current' ? target.current : target.next;
    if (!module) {
      throw new Error(`${pkg} has no ${form} entry`);
    }
    if (form === 'next' && target.namespace) {
      return [this.ensureImport(module, target.namespace, typeOnly), ...path].join('.');
    }
    return [this.ensureImport(module, path[0], typeOnly), ...path.slice(1)].join('.');
  }

  /** The local name of `name` imported from `module`, adding the import when the file has none. */
  ensureImport(module: string, name: string, typeOnly = false): string {
    const spec = packageOf(module);
    for (const binding of this.bindings.values()) {
      if (spec && binding.pkg === spec.pkg && binding.form === spec.form && binding.imported === name) {
        if (!typeOnly && binding.typeOnly && binding.specifier) {
          this.#upgraded.add(binding.specifier);
        }
        return binding.local;
      }
    }
    const pending = this.#pending.find((item) => item.module === module && item.name === name);
    if (pending) {
      pending.typeOnly &&= typeOnly;
      return pending.local;
    }
    const taken = (local: string) =>
      this.bindings.has(local) || this.isShadowed(local) || this.#pending.some((item) => item.local === local);
    const local = taken(name) ? `Next${name}` : name;
    const anchor = [...this.bindings.values()]
      .map((binding) => binding.declaration)
      .filter((decl) => !decl.importClause?.namedBindings || ts.isNamedImports(decl.importClause.namedBindings))
      .find((decl) => ts.isStringLiteral(decl.moduleSpecifier) && decl.moduleSpecifier.text === module);
    this.#pending.push({ module, name, local, typeOnly, anchor });
    return local;
  }

  /** Moves a binding to `module`, keeping its local name, so its references stay valid. */
  moveImport(binding: Binding, module: string) {
    if (!binding.specifier) {
      throw new Error(`Cannot move ${binding.local}`);
    }
    this.#removedSpecifiers.add(binding.specifier);
    const existing = this.#pending.find((item) => item.module === module && item.local === binding.local);
    if (!existing) {
      const anchor = [...this.bindings.values()].find(
        (other) => moduleText(other.declaration) === module && other.specifier,
      )?.declaration;
      this.#pending.push({ module, name: binding.imported, local: binding.local, typeOnly: binding.typeOnly, anchor });
    }
  }

  #readBindings() {
    for (const statement of this.sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !statement.importClause
      ) {
        continue;
      }
      const spec = packageOf(statement.moduleSpecifier.text);
      if (!spec) {
        continue;
      }
      const clause = statement.importClause;
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        this.bindings.set(bindings.name.text, {
          local: bindings.name.text,
          imported: '*',
          ...spec,
          typeOnly: clause.isTypeOnly,
          declaration: statement,
        });
      } else if (bindings) {
        for (const specifier of bindings.elements) {
          this.bindings.set(specifier.name.text, {
            local: specifier.name.text,
            imported: (specifier.propertyName ?? specifier.name).text,
            ...spec,
            typeOnly: clause.isTypeOnly || specifier.isTypeOnly,
            declaration: statement,
            specifier,
          });
        }
      }
    }
  }

  /** Rewrites each import declaration that lost or gained a specifier, and inserts declarations for new modules. */
  #finishImports() {
    const unused = new Set<ts.ImportSpecifier>(this.#removedSpecifiers);
    for (const [local, released] of this.#released) {
      const binding = this.bindings.get(local);
      if (binding?.specifier && this.references(local).length <= released) {
        unused.add(binding.specifier);
      }
    }

    const declarations = new Set<ts.ImportDeclaration>();
    for (const binding of this.bindings.values()) {
      if (binding.specifier && (unused.has(binding.specifier) || this.#upgraded.has(binding.specifier))) {
        declarations.add(binding.declaration);
      }
    }
    const added = new Map<ts.ImportDeclaration, PendingImport[]>();
    const created = new Map<string, PendingImport[]>();
    for (const item of this.#pending) {
      if (item.anchor) {
        added.set(item.anchor, [...(added.get(item.anchor) ?? []), item]);
        declarations.add(item.anchor);
      } else {
        created.set(item.module, [...(created.get(item.module) ?? []), item]);
      }
    }

    const imports = this.sourceFile.statements.filter(ts.isImportDeclaration);
    const after = imports.filter((decl) => packageOf(moduleText(decl))).at(-1) ?? imports.at(-1);
    const createdText = [...created]
      .map(([module, items]) => {
        const typeAll = items.every((item) => item.typeOnly);
        return `import ${typeAll ? 'type ' : ''}{ ${items.map((item) => specifierText(item, typeAll)).join(', ')} } from '${module}';`;
      })
      .join('\n');
    if (createdText && after && !declarations.has(after)) {
      this.edit(after.getEnd(), after.getEnd(), `\n${createdText}`);
    } else if (createdText && !after) {
      this.edit(0, 0, `${createdText}\n\n`);
    }

    for (const decl of declarations) {
      const trailing = createdText && decl === after ? createdText : undefined;
      const clause = decl.importClause;
      const named = clause?.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings : undefined;
      const declTypeOnly = clause?.isTypeOnly ?? false;
      const additions = added.get(decl) ?? [];
      const needsValue =
        additions.some((item) => !item.typeOnly) || (named?.elements.some((spec) => this.#upgraded.has(spec)) ?? false);
      const typeAll = declTypeOnly && !needsValue;
      const specifiers = [
        ...(named?.elements ?? [])
          .filter((spec) => !unused.has(spec))
          .map((spec) => {
            const text = spec.getText(this.sourceFile);
            if (this.#upgraded.has(spec)) {
              return text.replace(/^type\s+/, '');
            }
            return declTypeOnly && !typeAll && !spec.isTypeOnly ? `type ${text}` : text;
          }),
        ...additions.map((item) => specifierText(item, typeAll)),
      ];
      const defaultName = clause?.name?.text;
      if (specifiers.length === 0 && !defaultName) {
        if (trailing) {
          this.replace(decl, trailing);
        } else {
          this.remove(decl);
        }
        continue;
      }
      const parts = [defaultName, specifiers.length > 0 ? `{ ${specifiers.join(', ')} }` : undefined].filter(Boolean);
      const text = `import ${typeAll ? 'type ' : ''}${parts.join(', ')} from '${moduleText(decl)}';`;
      this.replace(decl, trailing ? `${text}\n${trailing}` : text);
    }
  }
}

const moduleText = (decl: ts.ImportDeclaration) =>
  ts.isStringLiteral(decl.moduleSpecifier) ? decl.moduleSpecifier.text : '';

const specifierText = (item: PendingImport, typeAll: boolean) =>
  `${item.typeOnly && !typeAll ? 'type ' : ''}${item.name}${item.local === item.name ? '' : ` as ${item.local}`}`;
