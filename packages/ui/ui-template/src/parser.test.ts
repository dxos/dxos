//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  BindingResolutionError,
  type Node,
  type ScopeFrame,
  TemplateParseError,
  fromState,
  resolve,
  select,
} from './index';
import { parse } from './parser';

describe('parse', () => {
  test('reads the three attribute families', ({ expect }) => {
    const node = parse(
      `<container id="project" gap="sm">
         <let name="title" initial="MOSAIC" />
         <display variant="title" data-text="title" />
         <control label="Name" data-value="title" on-commit="org.dxos.operation.projects.rename" />
       </container>`,
    );

    expect(node.tag).toBe('container');
    expect(node.props).toEqual({ id: 'project', gap: 'sm' });

    const [, display, control] = node.children as Node[];
    expect(display.data).toEqual({ text: { from: 'state', path: ['title'] } });
    expect(control.events).toEqual({ commit: 'org.dxos.operation.projects.rename' });
  });

  test('narrows numeric and boolean literals so the renderer never parses strings', ({ expect }) => {
    const [node] = parse('<container><layout cols="3" wrap="true" gap="sm" /></container>').children as Node[];
    expect(node.props).toEqual({ cols: 3, wrap: true, gap: 'sm' });
  });

  test('an item binding is scoped to the collection element', ({ expect }) => {
    const root = parse(
      '<container id="s">' +
        '<let name="tags" machine="org.dxos.machine.list" />' +
        '<collection data-items="tags"><display item-text="." /></collection>' +
        '</container>',
    );
    const [, collection] = root.children as Node[];
    const [child] = collection.children as Node[];
    expect(collection.data).toEqual({ items: { from: 'state', path: ['tags'] } });
    // A bare `.` is the item itself, so the path is empty rather than a literal key.
    expect(child.data).toEqual({ text: { from: 'item', path: [] } });
  });

  test('an unknown tag is an error, not a dropped element', ({ expect }) => {
    // ONTOLOGY R-8: a silently dropped element renders as though the author never wrote it.
    expect(() => parse('<widget />')).toThrow(TemplateParseError);
    expect(() => parse('<container><widget /></container>')).toThrow(/unknown tag 'widget'/);
  });

  test('an event value must name an operation key', ({ expect }) => {
    // ONTOLOGY R-3: the only outbound edge is an operation, never an arbitrary token.
    expect(() => parse('<container><control on-activate="rename" /></container>')).toThrow(
      /must name an operation key/,
    );
  });

  test('reports unbalanced and multi-root documents', ({ expect }) => {
    expect(() => parse('<container><display /></layout>')).toThrow(/expected <\/container>/);
    expect(() => parse('<container>')).toThrow(/unclosed <container>/);
    expect(() => parse('<display /><display />')).toThrow(/exactly one root/);
  });

  test('the root element must be a container', ({ expect }) => {
    // The template boundary owns the declarations; interior geometry starts one level down.
    expect(() => parse('<layout rows="1fr 1fr" />')).toThrow(/root element must be a 'container'/);
  });

  test('text content is not part of the grammar', ({ expect }) => {
    // A bound string is a `display` node with a binding, never a text child.
    expect(() => parse('<container>hello</container>')).toThrow(/unexpected text/);
  });

  test('when/on are intrinsic state bindings despite the missing data- prefix', ({ expect }) => {
    const [, show] = parse(
      '<container id="s">' +
        '<let name="selected" machine="org.dxos.machine.selection" />' +
        '<show when="selected.name"><display data-text="selected.name" /></show>' +
        '</container>',
    ).children as Node[];
    expect(show.data).toEqual({ when: { from: 'state', path: ['selected', 'name'] } });

    const [, node] = parse(
      '<container id="s">' +
        '<let name="view" machine="org.dxos.machine.view" />' +
        '<switch on="view"><match value="list"><display label="the-list" /></match></switch>' +
        '</container>',
    ).children as Node[];
    expect(node.data).toEqual({ on: { from: 'state', path: ['view'] } });
  });

  test('structural validation runs over the whole tree', ({ expect }) => {
    // `let` backing is exactly one of initial/machine/from — none is an error, both are an error.
    expect(() => parse('<container id="x"><let name="a" /></container>')).toThrow(
      /'let' requires exactly one of initial, machine, or from/,
    );
    expect(() =>
      parse('<container id="x"><let name="a" initial="0" machine="org.dxos.machine.flag" /></container>'),
    ).toThrow(/'let' requires exactly one of initial, machine, or from/);
    // `let` requires an enclosing element with an id.
    expect(() => parse('<container><let name="a" machine="org.dxos.machine.flag" /></container>')).toThrow(
      /enclosing element with an id/,
    );
    // `fallback` is only valid inside `show`.
    expect(() => parse('<container><fallback><display label="x" /></fallback></container>')).toThrow(
      /'fallback' is only valid inside 'show'/,
    );
    // `switch` children must be `match`.
    expect(() => parse('<container><switch on="view"><display label="x" /></switch></container>')).toThrow(
      /'switch' children must be 'match'/,
    );
    // `show` requires a when binding; `switch` requires on.
    expect(() => parse('<container><show><display label="x" /></show></container>')).toThrow(
      /'show' requires a when binding/,
    );
    expect(() =>
      parse('<container><switch><match value="list"><display label="x" /></match></switch></container>'),
    ).toThrow(/'switch' requires an on binding/);
  });
});

describe('closed resolution', () => {
  test('a binding to an undeclared name is a parse error, never a silent undefined', ({ expect }) => {
    // The no-magic-variables rule: nothing falls through to an ambient context object.
    expect(() => parse('<container><display data-text="title" /></container>')).toThrow(/names undeclared 'title'/);
    expect(() => parse('<container id="s"><let name="a" initial="0" /><display data-text="b" /></container>')).toThrow(
      /names undeclared 'b'/,
    );
  });

  test('a let slot is visible to its whole subtree, not to siblings of its scope', ({ expect }) => {
    const source =
      '<container id="outer">' +
      '<let name="a" initial="0" />' +
      '<container><display data-text="a" /></container>' +
      '</container>';
    expect(() => parse(source)).not.toThrow();
  });

  test('a bare-dot state binding has no name to resolve', ({ expect }) => {
    expect(() => parse('<container><collection data-items="." /></container>')).toThrow(/requires a path/);
  });

  test('a rung-1 let takes a literal initial value', ({ expect }) => {
    const [slot] = parse('<container id="s"><let name="count" initial="3" /></container>').children as Node[];
    expect(slot.props).toEqual({ name: 'count', initial: 3 });
  });

  test('a root var declares a typed input the template may bind', ({ expect }) => {
    const node = parse(
      '<container>' +
        '<var name="tasks" type="org.dxos.type.Task" many="true" />' +
        '<collection data-items="tasks" item-id="id" item-label="title" />' +
        '</container>',
    );
    const [decl] = node.children as Node[];
    expect(decl.props).toEqual({ name: 'tasks', type: 'org.dxos.type.Task', many: true });
  });

  test('var demands a name and a registry type key', ({ expect }) => {
    expect(() => parse('<container><var name="x" /></container>')).toThrow(/'var' requires a type/);
    expect(() => parse('<container><var type="org.dxos.type.X" /></container>')).toThrow(/'var' requires a name/);
    expect(() => parse('<container><var name="x" type="org.dxos.type.X" many="yes" /></container>')).toThrow(
      /'var' many must be a boolean/,
    );
  });

  test('var is only valid as a direct child of the root', ({ expect }) => {
    expect(() => parse('<container><layout><var name="x" type="org.dxos.type.X" /></layout></container>')).toThrow(
      /'var' is only valid as a direct child of the root/,
    );
  });

  test('a use alias declares a module import; bindings read <alias>.<export>', ({ expect }) => {
    const node = parse(
      '<container>' +
        '<use module="org.dxos.module.tasks" as="tasks" />' +
        '<display data-text="tasks.title" />' +
        '</container>',
    );
    const [decl] = node.children as Node[];
    expect(decl.props).toEqual({ module: 'org.dxos.module.tasks', as: 'tasks' });
  });

  test('use demands a module key and an alias, at the root only', ({ expect }) => {
    expect(() => parse('<container><use module="org.dxos.module.x" /></container>')).toThrow(/'use' requires an alias/);
    expect(() => parse('<container><use as="x" /></container>')).toThrow(/'use' requires a module/);
    expect(() => parse('<container><layout><use module="org.dxos.module.x" as="x" /></layout></container>')).toThrow(
      /'use' is only valid as a direct child of the root/,
    );
  });

  test('a binding through an alias must name an export', ({ expect }) => {
    expect(() =>
      parse(
        '<container>' +
          '<use module="org.dxos.module.tasks" as="tasks" />' +
          '<display data-text="tasks" />' +
          '</container>',
      ),
    ).toThrow(/through 'tasks' requires an export name/);
  });

  test('a rung-3 let binds a declared alias capability', ({ expect }) => {
    const source =
      '<container id="s">' +
      '<use module="org.dxos.module.tasks" as="tasks" />' +
      '<let name="selection" from="tasks.selection" />' +
      '<display data-text="selection" />' +
      '</container>';
    expect(() => parse(source)).not.toThrow();

    expect(() => parse('<container id="s"><let name="selection" from="tasks.selection" /></container>')).toThrow(
      /'let' from names undeclared alias 'tasks'/,
    );
    expect(() =>
      parse(
        '<container id="s">' +
          '<use module="org.dxos.module.tasks" as="tasks" />' +
          '<let name="selection" from="tasks" />' +
          '</container>',
      ),
    ).toThrow(/'let' from must name '<alias>.<capability>'/);
    expect(() => parse('<container id="s"><let name="a" initial="0" from="tasks.selection" /></container>')).toThrow(
      /'let' requires exactly one of initial, machine, or from/,
    );
  });

  test('duplicate root declarations are rejected', ({ expect }) => {
    expect(() =>
      parse(
        '<container>' +
          '<var name="x" type="org.dxos.type.X" />' +
          '<var name="x" type="org.dxos.type.Y" />' +
          '</container>',
      ),
    ).toThrow(/duplicate declaration 'x'/);
  });
});

describe('intrinsic bindings', () => {
  test("a control's enabled attribute is a state binding", ({ expect }) => {
    const node = parse(
      '<container id="x"><let name="ready" initial="true" /><control as="button" label="Done" enabled="ready" on-activate="org.dxos.operation.x.y" /></container>',
    );
    const control = node.children?.find((child) => child.tag === 'control');
    expect(control?.data).toEqual({ enabled: { from: 'state', path: ['ready'] } });
  });
});

describe('resolve', () => {
  type State = { title: string; nested: { count: number } };
  const frame: ScopeFrame = {
    id: 'project',
    path: ['project'],
    slots: ['title', 'nested'],
    values: { title: 'MOSAIC', nested: { count: 3 } },
  };

  test('walks a typed path through a declaring frame', ({ expect }) => {
    expect(resolve(fromState(select<State>().title), { frames: [frame] })).toBe('MOSAIC');
    expect(resolve(fromState(select<State>().nested.count), { frames: [frame] })).toBe(3);
  });

  test('an undeclared first segment throws rather than resolving undefined', ({ expect }) => {
    expect(() => resolve({ from: 'state', path: ['missing', 'deeper'] }, { frames: [frame] })).toThrow(
      BindingResolutionError,
    );
  });

  test('a path off a resolved slot yields undefined — legitimate absence, not an error', ({ expect }) => {
    expect(resolve({ from: 'state', path: ['nested', 'missing'] }, { frames: [frame] })).toBeUndefined();
  });

  test('an item binding reads the collection scope', ({ expect }) => {
    expect(resolve({ from: 'item', path: [] }, { item: 'ontology' })).toBe('ontology');
  });
});

describe('attribute edge cases', () => {
  test("a quoted '>' does not terminate the tag", ({ expect }) => {
    const [, node] = parse(
      '<container id="s"><let name="title" initial="x" /><display label="a > b" data-text="title" /></container>',
    ).children as Node[];
    expect(node.props).toEqual({ label: 'a > b' });
    expect(node.data).toEqual({ text: { from: 'state', path: ['title'] } });
  });

  test('signed and fractional numerics are coerced', ({ expect }) => {
    const [node] = parse('<container><layout span="1.5" offset="-2" /></container>').children as Node[];
    expect(node.props).toEqual({ span: 1.5, offset: -2 });
  });
});
