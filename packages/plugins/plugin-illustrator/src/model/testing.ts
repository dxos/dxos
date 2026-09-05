//
// Copyright 2026 DXOS.org
//

/**
 * Minimal layout discussion piece: three packages with three types each — an inheritance fan-in
 * (B, C extend A), a chain with a has-many (X ⇒ Y → Z), and a fan-in (P, R → Q). Small enough to
 * reason about every placement and route by eye.
 */
export const THREE_PACKAGES = `
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
  B -->|extends| A
  C -->|extends| A
  X -->|has many| Y
  Y --> Z
  P --> Q
  R --> Q
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
