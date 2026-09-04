//
// Copyright 2026 DXOS.org
//

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
