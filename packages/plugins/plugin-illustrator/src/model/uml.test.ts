//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Scene from './scene';
import { compile, isClassDiagram, parse } from './uml';

/** Exercises class blocks, a stereotype, generics, cardinalities, and every relation kind. */
export const CLASS_DIAGRAM = `
classDiagram
    direction TB

    class Animal {
        <<abstract>>
        +name: string
        +move() void
    }

    class Dog {
        +breed: string
        +bark() void
    }

    class Serializable {
        <<interface>>
        +serialize() string
    }

    class Leg
    class Owner

    Animal <|-- Dog
    Serializable <|.. Dog
    Dog *-- Leg
    Owner "1" o-- "*" Dog : owns
    Dog ..> Bone : chews
`;

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

  test('layers supertypes above subtypes', ({ expect }) => {
    const objects = objectsOf(compile(CLASS_DIAGRAM));
    const y = (id: string) => objects.find((object) => object.id === id)!.origin!.y;

    expect(y('Animal')).toBeLessThan(y('Dog'));
    expect(y('Serializable')).toBeLessThan(y('Dog'));
    // Dog's dependents/parts sit below it.
    expect(y('Dog')).toBeLessThan(y('Leg'));
    expect(y('Dog')).toBeLessThan(y('Bone'));
  });

  test('binds arrows to class title compartments with UML styling', ({ expect }) => {
    const edges = objectsOf(compile(CLASS_DIAGRAM)).find((object) => object.id === 'edges')!;
    const arrows = edges.elements as Scene.Arrow[];

    expect(arrows.every((arrow) => arrow.kind === 'arrow')).toBe(true);
    const inheritance = arrows.find((arrow) => arrow.from === 'Dog/title' && arrow.to === 'Animal/title')!;
    expect(inheritance.stroke).toBeUndefined();
    const realization = arrows.find((arrow) => arrow.to === 'Serializable/title')!;
    expect(realization.stroke).toBe('dashed');
    const aggregation = arrows.find((arrow) => arrow.from === 'Owner/title')!;
    expect(aggregation.text).toBe('1 owns *');
    const composition = arrows.find((arrow) => arrow.to === 'Leg/title')!;
    expect(composition.text).toBe('◆');
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
