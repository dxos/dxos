# DXOS

DXOS is an open-source framework for building local-first, real-time collaborative software that runs primarily on the client and synchronizes data peer-to-peer rather than relying on centralized cloud servers. Its core thesis is that modern applications should be user-owned, offline-capable, privacy-preserving, and multiplayer by default.

At a high level, DXOS aims to provide the infrastructure layer for applications similar to collaborative workspaces, design tools, knowledge systems, and AI-native apps—without forcing developers to build their own sync engines, identity systems, or conflict-resolution logic.

The platform is built around several core components:
- **ECHO** — a distributed client-side database and reactive state layer that handles local storage, replication, and conflict resolution.
- **HALO** — decentralized identity and access control using public/private key cryptography.
- **MESH** — peer-to-peer networking and transport infrastructure.
- **EDGE** — optional cloud services for backup, sync continuity, and compute.
- **Composer** — a plugin-based application framework and reference workspace product built on the stack.

A defining architectural principle is local-first software. Data is stored locally on the user’s device first, which enables instant startup, offline operation, and fast interaction. Synchronization occurs automatically between devices and collaborators using peer-to-peer protocols and CRDT-based conflict resolution (DXOS references Automerge as a core collaboration primitive). This allows multiple users to edit shared data concurrently without overwriting each other’s changes.  ￼

Strategically, DXOS sits at the intersection of several major software trends:
- offline-first / local-first apps
- collaborative multiplayer software
- decentralized identity
- plugin-based workspaces
- AI-enhanced personal data environments

Rather than being a traditional operating system, DXOS is better understood as an application runtime and data layer for next-generation collaborative web applications. In practice, it competes conceptually with architectures built on Firebase, Supabase, or custom CRDT stacks, but with stronger emphasis on peer-to-peer design and user data ownership.

Its likely strongest use cases include collaborative editors, internal tools, personal knowledge systems, workspace products, multiplayer productivity apps, and AI agents that need durable shared state.

In concise terms: DXOS is an operating-system-like framework for building cloud-optional collaborative applications where data belongs to the user and sync is built in from the start.