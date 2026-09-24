//
// Copyright 2026 DXOS.org
//

//
// MOSAIC (Model-Oriented System for Adaptive Interface Composition) UI-schematic dialect:
// renders low-fidelity UI wireframes from the declarative app model. Phase 1 scope: a single
// schema compiles to a form drawing — the recursive structure (nested objects, arrays) with each
// control (input, switch, checkbox, select) as a rectangle and its label as text above — wrapped
// in the app-ontology containers (deck > plank > panel > form). Two renderers share the model:
// ASCII (tests, chat) and scene commands (tldraw, via the standard dialect contract). Unrelated
// to `react-ui-mosaic`. See `dialect.ts` for the extension mechanism this follows (mermaid is
// the sibling precedent).
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import type * as Scene from './scene.ts';

//
// Drawing model. Plain data (one discriminated tree) — the intermediate model between the app
// model (schema today; app-graph later) and the renderers.
//

export type ControlKind = 'input' | 'switch' | 'checkbox' | 'select';

export type Control = {
  kind: 'control';
  control: ControlKind;
  label: string;
  /** Dotted schema path; doubles as the element id so drawn controls stay addressable. */
  path: string;
};

/** Nested object: a labeled group of fields. */
export type Group = {
  kind: 'group';
  label: string;
  path: string;
  children: FormChild[];
};

/** Array: a labeled repetition of one item template. */
export type ArrayGroup = {
  kind: 'array';
  label: string;
  path: string;
  /** The element template, rendered once with a trailing "+" affordance. */
  item: FormChild;
};

export type FormChild = Control | Group | ArrayGroup;

/** A form has no title of its own — the schema title belongs to the enclosing container. */
export type Form = { kind: 'form'; children: FormChild[] };
export type Panel = { kind: 'panel'; label?: string; child: Form };
export type Plank = { kind: 'plank'; label?: string; child: Panel };
export type Deck = { kind: 'deck'; planks: Plank[] };

export type UiNode = Deck | Plank | Panel | Form | FormChild;

//
// Schema → drawing. Minimal v4 AST walking, self-contained (see @dxos/effect SchemaEx for the
// full-featured helpers): properties live on `Objects` nodes, `Schema.optional` is a
// `T | undefined` union, arrays are `Arrays` with a single rest element.
//

export type FromSchemaOptions = {
  /** Recursion guard for self-referential schemas. */
  maxDepth?: number;
};

const unwrapSuspend = (ast: SchemaAST.AST): SchemaAST.AST =>
  SchemaAST.isSuspend(ast) ? unwrapSuspend(ast.thunk()) : ast;

const unwrapOptional = (ast: SchemaAST.AST): SchemaAST.AST => {
  let node = ast;
  while (SchemaAST.isUnion(node) && node.types.length === 2 && SchemaAST.isUndefined(node.types[1])) {
    node = node.types[0];
  }
  return node;
};

const propertiesOf = (ast: SchemaAST.AST): ReadonlyArray<SchemaAST.PropertySignature> => {
  const node = unwrapSuspend(ast);
  return node._tag === 'Objects' ? node.propertySignatures : [];
};

const isLiteralUnion = (node: SchemaAST.AST): boolean =>
  SchemaAST.isUnion(node) && node.types.length > 0 && node.types.every(SchemaAST.isLiteral);

const arrayElementOf = (node: SchemaAST.AST): SchemaAST.AST | undefined =>
  SchemaAST.isArrays(node) && node.elements.length === 0 && node.rest.length === 1 ? node.rest[0] : undefined;

const titleOf = (ast: SchemaAST.AST): string | undefined => {
  const title = (ast.annotations?.title ?? SchemaAST.resolve(ast)?.title) as string | undefined;
  return typeof title === 'string' ? title : undefined;
};

const label = (name: PropertyKey, type: SchemaAST.AST): string => titleOf(type) ?? String(name);

const controlOf = (type: SchemaAST.AST, name: PropertyKey, path: string): Control => {
  const control: ControlKind = isLiteralUnion(type) ? 'select' : type._tag === 'Boolean' ? 'checkbox' : 'input';
  return { kind: 'control', control, label: label(name, type), path };
};

const childOf = (type: SchemaAST.AST, name: PropertyKey, path: string, depth: number): FormChild => {
  const base = unwrapOptional(unwrapSuspend(type));

  const element = arrayElementOf(base);
  if (element && depth > 0) {
    // The array frame already names the collection; an item template carries no label of its own.
    const item = { ...childOf(element, '', `${path}[]`, depth - 1), label: '' };
    return { kind: 'array', label: label(name, base), path, item };
  }

  // Nested struct: recurse. Declarations (refs, opaque types) fall through to a plain control —
  // walking into them risks unbounded recursion and they render as pickers anyway.
  if (depth > 0 && !isLiteralUnion(base)) {
    const properties = propertiesOf(base);
    if (properties.length > 0) {
      return {
        kind: 'group',
        label: label(name, base),
        path,
        children: properties.map((property) =>
          childOf(property.type, property.name, `${path}.${String(property.name)}`, depth - 1),
        ),
      };
    }
  }

  return controlOf(base, name, path);
};

/** Convert a schema into a form drawing: the phase-1 slice of the app model. */
export const fromSchema = (schema: Schema.Top, options: FromSchemaOptions = {}): Form => {
  const { maxDepth = 4 } = options;
  const children = propertiesOf(schema.ast)
    .filter((property) => property.name !== 'id')
    .map((property) => childOf(property.type, property.name, String(property.name), maxDepth));
  return { kind: 'form', children };
};

/** The schema's title annotation — container chrome, not form content. */
export const schemaTitle = (schema: Schema.Top): string | undefined => titleOf(schema.ast);

/** Wrap a form in the app-ontology containers for a full schematic. */
export const deckOf = (form: Form, title?: string): Deck => ({
  kind: 'deck',
  planks: [{ kind: 'plank', label: title, child: { kind: 'panel', child: form } }],
});

//
// Scene layout. Vertical flow; containers pad and frame their content. Units are scene units
// (the caller scales), mirroring the mermaid dialect.
//

const CONTROL_W = 200;
const CONTROL_H = 28;
const TOGGLE_W = 28;
const LABEL_H = 18;
const GAP = 12;
const PAD = 16;
const TITLE_H = 22;
const PLUS_H = 20;

type Emit = { commands: Scene.Command[]; elements: Scene.Element[] };

const controlHeight = (node: Control) => (node.label ? LABEL_H : 0) + CONTROL_H;

const heightOf = (node: UiNode): number => {
  switch (node.kind) {
    case 'control':
      return controlHeight(node);
    case 'group':
      // An anonymous group (an array's item template) flows its children without chrome.
      if (!node.label) {
        return node.children.reduce((sum, child, index) => sum + heightOf(child) + (index > 0 ? GAP : 0), 0);
      }
      return TITLE_H + node.children.reduce((sum, child) => sum + heightOf(child) + GAP, 0) + PAD;
    case 'array':
      return TITLE_H + heightOf(node.item) + PAD;
    case 'form':
      return node.children.reduce((sum, child, index) => sum + heightOf(child) + (index > 0 ? GAP : 0), 0);
    case 'panel':
      return heightOf(node.child) + PAD * 2 + TITLE_H;
    case 'plank':
      return heightOf(node.child) + PAD * 2 + (node.label ? TITLE_H : 0);
    case 'deck':
      return Math.max(...node.planks.map(heightOf), 0) + PAD * 2;
  }
};

const widthOf = (node: UiNode): number => {
  switch (node.kind) {
    case 'control':
      return CONTROL_W;
    case 'group':
      return Math.max(...node.children.map(widthOf), CONTROL_W) + (node.label ? PAD : 0);
    case 'array':
      return Math.max(widthOf(node.item), CONTROL_W) + PAD;
    case 'form':
      return Math.max(...node.children.map(widthOf), CONTROL_W);
    case 'panel':
      return widthOf(node.child) + PAD * 2;
    case 'plank':
      return widthOf(node.child) + PAD * 2;
    case 'deck':
      return node.planks.reduce((sum, plank, index) => sum + widthOf(plank) + (index > 0 ? GAP : 0), 0) + PAD * 2;
  }
};

/** Qualify a node id with its container, so two planks over the same schema stay addressable. */
const qualify = (prefix: string, path: string): string => (prefix ? `${prefix}.${path}` : path);

/** One world object per control (id = container path), so drawn controls stay individually addressable. */
const emitControl = (node: Control, x: number, y: number, emit: Emit, prefix: string): void => {
  const top = node.label ? LABEL_H : 0;
  const elements: Scene.Element[] = node.label
    ? [{ kind: 'text', id: 'label', x: 0, y: 0, text: node.label, weight: 's', color: 'grey' }]
    : [];
  switch (node.control) {
    case 'checkbox':
    case 'switch':
      elements.push({ kind: 'rect', id: 'box', x: 0, y: top, w: TOGGLE_W, h: CONTROL_H, stroke: 'solid' });
      break;
    case 'select':
      elements.push(
        { kind: 'rect', id: 'box', x: 0, y: top, w: CONTROL_W, h: CONTROL_H, stroke: 'solid' },
        { kind: 'text', id: 'caret', x: CONTROL_W - 20, y: top + 4, text: '*', weight: 's', color: 'grey' },
      );
      break;
    case 'input':
      elements.push({ kind: 'rect', id: 'box', x: 0, y: top, w: CONTROL_W, h: CONTROL_H, stroke: 'solid' });
      break;
  }
  emit.commands.push({ op: 'upsert-object', object: { id: qualify(prefix, node.path), origin: { x, y }, elements } });
};

const frame = (id: string, x: number, y: number, w: number, h: number, title: string | undefined, emit: Emit): void => {
  const elements: Scene.Element[] = [{ kind: 'rect', id: 'frame', x: 0, y: 0, w, h, stroke: 'dashed', color: 'grey' }];
  if (title) {
    elements.push({ kind: 'text', id: 'title', x: PAD / 2, y: 2, text: title, weight: 's' });
  }
  emit.commands.push({ op: 'upsert-object', object: { id, origin: { x, y }, elements } });
};

const emitNode = (node: UiNode, x: number, y: number, emit: Emit, prefix = ''): void => {
  switch (node.kind) {
    case 'control':
      emitControl(node, x, y, emit, prefix);
      break;

    case 'group': {
      const anonymous = !node.label;
      if (!anonymous) {
        frame(qualify(prefix, node.path), x, y, widthOf(node), heightOf(node), node.label, emit);
      }
      let cursor = y + (anonymous ? 0 : TITLE_H);
      for (const child of node.children) {
        emitNode(child, x + (anonymous ? 0 : PAD), cursor, emit, prefix);
        cursor += heightOf(child) + GAP;
      }
      break;
    }

    case 'array': {
      const width = widthOf(node);
      const id = qualify(prefix, node.path);
      frame(id, x, y, width, heightOf(node), node.label, emit);
      // The add button sits on the header line, where the array marker reads in ASCII.
      emit.commands.push({
        op: 'upsert-object',
        object: {
          id: `${id}.add`,
          origin: { x: x + width - TOGGLE_W - 4, y: y + 2 },
          elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: TOGGLE_W, h: PLUS_H, text: '+', stroke: 'solid' }],
        },
      });
      emitNode(node.item, x + PAD, y + TITLE_H, emit, prefix);
      break;
    }

    case 'form': {
      let cursor = y;
      for (const child of node.children) {
        emitNode(child, x, cursor, emit, prefix);
        cursor += heightOf(child) + GAP;
      }
      break;
    }

    case 'panel': {
      const id = qualify(prefix, 'panel');
      frame(id, x, y, widthOf(node), heightOf(node), node.label ?? 'panel', emit);
      emitNode(node.child, x + PAD, y + TITLE_H + PAD, emit, id);
      break;
    }

    case 'plank': {
      const id = prefix || 'plank';
      frame(id, x, y, widthOf(node), heightOf(node), node.label, emit);
      emitNode(node.child, x + PAD, y + PAD + (node.label ? TITLE_H : 0), emit, id);
      break;
    }

    case 'deck': {
      const id = qualify(prefix, 'deck');
      frame(id, x, y, widthOf(node), heightOf(node), undefined, emit);
      let cursor = x + PAD;
      // Index, not label: an unlabeled plank must still get a distinct id.
      node.planks.forEach((plank, index) => {
        emitNode(plank, cursor, y + PAD, emit, `${id}.plank${index}`);
        cursor += widthOf(plank) + GAP;
      });
      break;
    }
  }
};

export type CompileOptions = {
  /** Canvas position of the schematic's top-left, in canvas px. */
  origin?: Scene.Point;
  /** Canvas px per scene unit. */
  scale?: number;
};

/** Compile a UI drawing into scene commands (frames first, controls above them). */
export const compile = (node: UiNode, options: CompileOptions = {}): Scene.Command[] => {
  const { origin = { x: 0, y: 0 }, scale = 1 } = options;
  const emit: Emit = { commands: [], elements: [] };
  emitNode(node, 0, 0, emit);
  return emit.commands.map((command) =>
    command.op === 'upsert-object'
      ? {
          ...command,
          object: {
            ...command.object,
            scale,
            origin: {
              x: origin.x + (command.object.origin?.x ?? 0) * scale,
              y: origin.y + (command.object.origin?.y ?? 0) * scale,
            },
          },
        }
      : command,
  );
};

//
// ASCII renderer — the interim/low-cost target over the same model.
//

const GLYPHS: Record<ControlKind, string> = {
  input: '[__________]',
  select: '[_________*]',
  checkbox: '[ ]',
  switch: '(o )',
};

const indent = (lines: string[], prefix: string): string[] => lines.map((line) => (prefix + line).trimEnd());

/** Wrap lines in a +--- box, optionally titled. */
const boxed = (lines: string[], title?: string): string[] => {
  const width = Math.max(...lines.map((line) => line.length), (title?.length ?? 0) + 4, 12);
  const top = title
    ? `+- ${title} ${'-'.repeat(Math.max(width - title.length - 1, 1))}+`
    : `+${'-'.repeat(width + 2)}+`;
  return [top, ...lines.map((line) => `| ${line.padEnd(width)} |`), `+${'-'.repeat(width + 2)}+`];
};

const asciiLines = (node: UiNode): string[] => {
  switch (node.kind) {
    case 'control':
      return node.label ? [node.label, GLYPHS[node.control]] : [GLYPHS[node.control]];
    case 'group': {
      const children = node.children.flatMap((child, index) =>
        index > 0 ? ['', ...asciiLines(child)] : asciiLines(child),
      );
      return node.label ? [node.label, ...indent(children, '  ')] : children;
    }
    case 'array':
      return [`${node.label} [+]`, ...indent(asciiLines(node.item), '  ')];
    case 'form':
      return node.children.flatMap((child, index) => (index > 0 ? ['', ...asciiLines(child)] : asciiLines(child)));
    case 'panel':
      return boxed(asciiLines(node.child), node.label);
    case 'plank':
      return boxed(asciiLines(node.child), node.label);
    case 'deck':
      return node.planks.flatMap((plank, index) => (index > 0 ? ['', ...asciiLines(plank)] : asciiLines(plank)));
  }
};

/** Render a UI drawing as ASCII art. */
export const renderAscii = (node: UiNode): string => asciiLines(node).join('\n');
