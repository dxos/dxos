//
// Copyright 2026 DXOS.org
//

import clusterExemplar from './testing/exemplars/cluster.dx?raw';
import cubeExemplar from './testing/exemplars/cube.dx?raw';
import encapsulatedExemplar from './testing/exemplars/encapsulated.dx?raw';
import hierarchyExemplar from './testing/exemplars/hierarchy.dx?raw';
import linksExemplar from './testing/exemplars/links.dx?raw';
import solidExemplar from './testing/exemplars/solid.dx?raw';
import squareExemplar from './testing/exemplars/square.dx?raw';
import subsceneExemplar from './testing/exemplars/subscene.dx?raw';

/**
 * Minimal layout discussion piece: three packages with three types each — an inheritance fan-in
 * (B, C extend A), a chain with a has-many (X ⇒ Y → Z), and a fan-in (P, R → Q), plus two
 * cross-package references (Y → A, Q → X) so routes must leave and enter frames. Small enough to
 * reason about every placement and route by eye. Relationship kinds are carried by the edge
 * tokens (UML end markers), not labels.
 */
export const BASIC = `
flowchart TB
  subgraph pkgA [Package A]
    A[A]
    B[B]
    C[C]
  end
  subgraph pkgX [Package X]
    X[X]
    Y[Y]
    Z[Z]
  end
  subgraph pkgP [Package P]
    P[P]
    Q[Q]
    R[R]
  end
  B --|> A
  C --|> A
  X --{ Y
  Y --> Z
  P --> Q
  R --> Q
  Y --> A
  Q --> X
`;

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

export const EXEMPLAR_NAMES = [
  'square',
  'links',
  'subscene',
  'cube',
  'cluster',
  'encapsulated',
  'hierarchy',
  'solid',
] as const;
export type ExemplarName = (typeof EXEMPLAR_NAMES)[number];

/** The scene-model exemplars (scene design, stage 2) in canonical `.dx` text: three 2D scenes, then five 3D. */
export const EXEMPLARS: Record<ExemplarName, string> = {
  square: squareExemplar,
  links: linksExemplar,
  subscene: subsceneExemplar,
  cube: cubeExemplar,
  cluster: clusterExemplar,
  encapsulated: encapsulatedExemplar,
  hierarchy: hierarchyExemplar,
  solid: solidExemplar,
};
