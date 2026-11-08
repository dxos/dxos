//
// Copyright 2026 DXOS.org
//

import * as Acorn from 'acorn';

/** A program whose top-level declarations bind session globals instead of locals. */
export type Rewritten = {
  /** The program body, with each top-level declaration turned into an assignment. */
  readonly code: string;
  /** Every name the program's top level declares, in order of appearance. */
  readonly names: readonly string[];
};

// The program is the body of an `Effect.gen` generator, so it is parsed as one: `yield*` and a
// top-level `return` are legal there and nowhere else.
const PREFIX = 'function* program() {\n';
const SUFFIX = '\n}';

type Edit = { readonly start: number; readonly end: number; readonly text: string };

/**
 * Turns a program's top-level `const`/`let`/`var`, `function` and `class` declarations into
 * assignments to session globals, so a later program in the same session reads what this one bound.
 *
 * Only the top level is rewritten: declarations in blocks, loops and functions keep JavaScript's
 * scoping. Function declarations are hoisted to the top, as the language hoists them. A program
 * that does not parse is returned unchanged, so the engine reports the syntax error in its own
 * words.
 */
export const rewriteTopLevel = (program: string): Rewritten => {
  let ast: Acorn.Program;
  try {
    ast = Acorn.parse(`${PREFIX}${program}${SUFFIX}`, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch {
    return { code: program, names: [] };
  }
  const [wrapper] = ast.body;
  if (wrapper?.type !== 'FunctionDeclaration') {
    return { code: program, names: [] };
  }

  const source = (node: Acorn.Node): string => program.slice(node.start - PREFIX.length, node.end - PREFIX.length);
  const names: string[] = [];
  const declare = (name: string) => {
    if (!names.includes(name)) {
      names.push(name);
    }
  };

  const edits: Edit[] = [];
  const hoisted: string[] = [];
  for (const statement of wrapper.body.body) {
    const start = statement.start - PREFIX.length;
    const end = statement.end - PREFIX.length;
    switch (statement.type) {
      case 'VariableDeclaration': {
        const assignments = statement.declarations.flatMap((declarator) => {
          patternNames(declarator.id).forEach(declare);
          if (!declarator.init) {
            // `let x;` declares without a value: the name exists, holding whatever it held.
            return [];
          }
          const target = source(declarator.id);
          const value = source(declarator.init);
          // An object pattern on the left of a bare assignment would read as a block.
          return [declarator.id.type === 'ObjectPattern' ? `(${target} = ${value})` : `${target} = ${value}`];
        });
        edits.push({ start, end, text: assignments.length > 0 ? `${assignments.join('; ')};` : ';' });
        break;
      }
      case 'FunctionDeclaration': {
        if (statement.id) {
          declare(statement.id.name);
          hoisted.push(`${statement.id.name} = ${source(statement)};`);
          edits.push({ start, end, text: ';' });
        }
        break;
      }
      case 'ClassDeclaration': {
        if (statement.id) {
          declare(statement.id.name);
          edits.push({ start, end, text: `${statement.id.name} = ${source(statement)};` });
        }
        break;
      }
      default:
        break;
    }
  }

  let code = program;
  for (const { start, end, text } of [...edits].sort((left, right) => right.start - left.start)) {
    code = `${code.slice(0, start)}${text}${code.slice(end)}`;
  }
  return { code: hoisted.length > 0 ? `${hoisted.join('\n')}\n${code}` : code, names };
};

/** The names a binding pattern introduces. */
const patternNames = (pattern: Acorn.Pattern): string[] => {
  switch (pattern.type) {
    case 'Identifier':
      return [pattern.name];
    case 'ObjectPattern':
      return pattern.properties.flatMap((property) =>
        property.type === 'RestElement' ? patternNames(property.argument) : patternNames(property.value),
      );
    case 'ArrayPattern':
      return pattern.elements.flatMap((element) => (element ? patternNames(element) : []));
    case 'RestElement':
      return patternNames(pattern.argument);
    case 'AssignmentPattern':
      return patternNames(pattern.left);
    default:
      return [];
  }
};
