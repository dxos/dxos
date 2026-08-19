//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Scene from './scene';
import { CLASS_DIAGRAM } from './testing';
import { compile, isClassDiagram, parse } from './uml';

const objectsOf = (commands: Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

describe('uml', () => {
  test('detects class diagrams', ({ expect }) => {
    expect(isClassDiagram(CLASS_DIAGRAM)).toBe(true);
    expect(isClassDiagram('flowchart TB\nA --> B')).toBe(false);
  });

  test('parses classes, members and stereotypes', ({ expect }) => {
    const model = parse(CLASS_DIAGRAM);

    expect(model.direction).toBe('TB');
    expect(model.classes.map((entry) => entry.id).sort()).toEqual([
      'Animal',
      'Bone',
      'Dog',
      'Leg',
      'Owner',
      'Serializable',
    ]);

    const animal = model.classes.find((entry) => entry.id === 'Animal')!;
    expect(animal.stereotype).toBe('abstract');
    expect(animal.attributes).toEqual(['+name: string']);
    expect(animal.methods).toEqual(['+move() void']);

    // Classes first mentioned in a relation are auto-declared, empty.
    const bone = model.classes.find((entry) => entry.id === 'Bone')!;
    expect(bone.attributes).toEqual([]);
    expect(bone.methods).toEqual([]);
  });

  test('normalizes relations to subtype → supertype and whole → part', ({ expect }) => {
    const { relations } = parse(CLASS_DIAGRAM);
    const byKind = (kind: string) => relations.filter((relation) => relation.kind === kind);

    // `Animal <|-- Dog`: the arrow renders from the subtype to its parent.
    expect(byKind('inheritance')).toEqual([{ from: 'Dog', to: 'Animal', kind: 'inheritance' }]);
    expect(byKind('realization')).toEqual([{ from: 'Dog', to: 'Serializable', kind: 'realization' }]);
    expect(byKind('composition')).toEqual([{ from: 'Dog', to: 'Leg', kind: 'composition' }]);
    expect(byKind('aggregation')).toEqual([
      { from: 'Owner', to: 'Dog', kind: 'aggregation', label: 'owns', fromCardinality: '1', toCardinality: '*' },
    ]);
    expect(byKind('dependency')).toEqual([{ from: 'Dog', to: 'Bone', kind: 'dependency', label: 'chews' }]);
  });

  test('renders generics from tilde syntax', ({ expect }) => {
    const model = parse(['classDiagram', 'class List~T~', 'List~T~ o-- Item'].join('\n'));
    expect(model.classes.find((entry) => entry.id === 'List~T~')?.label).toBe('List<T>');
  });

  test('compiles one object per class with compartments, plus an edges object', ({ expect }) => {
    const objects = objectsOf(compile(CLASS_DIAGRAM));

    expect(objects.map((object) => object.id).sort()).toEqual([
      'Animal',
      'Bone',
      'Dog',
      'Leg',
      'Owner',
      'Serializable',
      'edges',
    ]);

    const dog = objects.find((object) => object.id === 'Dog')!;
    expect(dog.elements.map((element) => element.id)).toEqual(['title', 'attributes', 'methods']);
    const [title, attributes, methods] = dog.elements as Scene.Box[];
    expect(title.text).toBe('Dog');
    expect(attributes.text).toBe('+breed: string');
    expect(methods.text).toBe('+bark() void');
    // Compartments stack flush: each starts where the previous one ends.
    expect(attributes.y).toBe(title.h);
    expect(methods.y).toBe(title.h + attributes.h);
    expect(new Set([title.w, attributes.w, methods.w]).size).toBe(1);

    // A memberless class is just its title compartment.
    const leg = objects.find((object) => object.id === 'Leg')!;
    expect(leg.elements.map((element) => element.id)).toEqual(['title']);

    // Stereotypes render as a guillemet line above the name.
    const serializable = objects.find((object) => object.id === 'Serializable')!;
    expect((serializable.elements[0] as Scene.Box).text).toBe('«interface»\nSerializable');
  });

  test('layers supertypes and dependency targets above, parts below', ({ expect }) => {
    const objects = objectsOf(compile(CLASS_DIAGRAM));
    const y = (id: string) => objects.find((object) => object.id === id)!.origin!.y;

    expect(y('Animal')).toBeLessThan(y('Dog'));
    expect(y('Serializable')).toBeLessThan(y('Dog'));
    // Dog's parts sit below it; what it depends on sits above, so the arrow reads upward.
    expect(y('Dog')).toBeLessThan(y('Leg'));
    expect(y('Bone')).toBeLessThan(y('Dog'));
  });

  test('binds arrows to the compartments facing the peer, with UML styling', ({ expect }) => {
    const edges = objectsOf(compile(CLASS_DIAGRAM)).find((object) => object.id === 'edges')!;
    const arrows = edges.elements as Scene.Arrow[];

    expect(arrows.every((arrow) => arrow.kind === 'arrow')).toBe(true);
    // Dog sits below Animal: the arrow leaves Dog's top compartment and meets Animal's bottom
    // one, so the visible segment stays in the rank gap instead of crossing Animal's members.
    const inheritance = arrows.find((arrow) => arrow.from === 'Dog/title' && arrow.to === 'Animal/methods')!;
    expect(inheritance.stroke).toBeUndefined();
    const realization = arrows.find((arrow) => arrow.to === 'Serializable/methods')!;
    expect(realization.stroke).toBe('dashed');
    const aggregation = arrows.find((arrow) => arrow.from === 'Owner/title')!;
    expect(aggregation.to).toBe('Dog/title');
    expect(aggregation.text).toBe('1 owns *');
    // Memberless classes below Dog bind to their only compartment; Dog faces them with its last.
    const composition = arrows.find((arrow) => arrow.to === 'Leg/title')!;
    expect(composition.from).toBe('Dog/methods');
    expect(composition.text).toBe('◆');
  });

  test('wraps long member lines into taller compartments, capped at maxWidth', ({ expect }) => {
    const diagram = (member: string) => ['classDiagram', 'class A {', `  +${member}`, '}'].join('\n');
    const short = objectsOf(compile(diagram('id() string')))[0];
    const long = objectsOf(
      compile(diagram('reallyQuiteLongMethodName(withSomeArguments, andMoreArguments, andEvenMore) ReturnType')),
    )[0];

    const shortMethods = short.elements.find((element) => element.id === 'methods') as Scene.Box;
    const longMethods = long.elements.find((element) => element.id === 'methods') as Scene.Box;
    expect(longMethods.w).toBeLessThanOrEqual(400);
    expect(longMethods.h).toBeGreaterThan(shortMethods.h);

    // A tighter maxWidth narrows the box and wraps into even more lines.
    const narrow = objectsOf(
      compile(diagram('reallyQuiteLongMethodName(withSomeArguments, andMoreArguments, andEvenMore) ReturnType'), {
        maxWidth: 240,
      }),
    )[0];
    const narrowMethods = narrow.elements.find((element) => element.id === 'methods') as Scene.Box;
    expect(narrowMethods.w).toBeLessThanOrEqual(240);
    expect(narrowMethods.h).toBeGreaterThan(longMethods.h);
  });

  test('gap options spread the layout', ({ expect }) => {
    const compact = objectsOf(compile(CLASS_DIAGRAM));
    const spread = objectsOf(compile(CLASS_DIAGRAM, { gapMain: 200, gapCross: 150 }));
    const origin = (objects: Scene.WorldObject[], id: string) => objects.find((object) => object.id === id)!.origin!;

    expect(origin(spread, 'Dog').y - origin(spread, 'Animal').y).toBeGreaterThan(
      origin(compact, 'Dog').y - origin(compact, 'Animal').y,
    );
    expect(Math.abs(origin(spread, 'Serializable').x - origin(spread, 'Animal').x)).toBeGreaterThan(
      Math.abs(origin(compact, 'Serializable').x - origin(compact, 'Animal').x),
    );
  });

  test('ignores comments and tolerates unknown syntax', ({ expect }) => {
    const model = parse(
      ['classDiagram', '%% a comment', 'class A', 'A <|-- B', 'note for A "irrelevant"', 'style A fill:#f9f'].join(
        '\n',
      ),
    );
    expect(model.classes.map((entry) => entry.id)).toEqual(['A', 'B']);
    expect(model.relations).toEqual([{ from: 'B', to: 'A', kind: 'inheritance' }]);
  });
});
