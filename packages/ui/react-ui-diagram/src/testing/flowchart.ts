//
// Copyright 2026 DXOS.org
//

/** Reference flowchart: node declarations, a blank-labelled subgraph, fan-out, and a `C <-> Y` cycle. */
export const FLOWCHART = `flowchart TB
    X[X]

    subgraph CORE[" "]
        A[A]
        B[B]
        C[C]

        A --> B
        A --> C
    end

    Y[Y]

    X --> A
    X --> B
    X --> C
    C --> Y
    Y --> C
`;

/** Subgraph within a subgraph, to exercise the layout's recursion past one level. */
export const NESTED_FLOWCHART = `flowchart TB
    UI[Client]

    subgraph SERVER[Server]
        API[API]

        subgraph CORE[Core]
            Store[Store]
            Index[Index]
        end

        API --> Store
        API --> Index
    end

    UI --> API
`;
