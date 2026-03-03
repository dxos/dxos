# @dxos/client

Core DXOS Client API.

## Installation

```bash
pnpm i @dxos/client
```

## Usage

Create a client object like this:

```ts
import { Client } from '@dxos/client';
const client = new Client();
```

## Documentation

- [⚡️ Quick Start](https://docs.dxos.org/guide/quick-start)
- [📖 Developer Guide](https://docs.dxos.org/guide/echo/)
- [📚 API Reference](https://docs.dxos.org/api/@dxos/client)

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS

## Worker architecture

```mermaid
sequenceDiagram
    participant C1 as Client 1 (Leader)
    participant Coord as Coordinator (SharedWorker)
    participant W as Worker (Dedicated)
    participant C2 as Client 2 (Follower)

    Note over C1, W: 1. Leader Initialization
    C1->>Coord: Connect
    C1->>C1: Request Leader Lock (Success)
    C1->>W: Spawn Worker
    W->>C1: msg: listening
    Note right of C1: Wait for 'listening' to ensure worker<br/>doesn't miss subsequent messages
    C1->>W: msg: init (Client1_ID)
    W->>C1: msg: ready (LivenessKey)
    C1->>Coord: msg: new-leader (Leader_ID)

    Note over C1, W: 2. Client 1 Self-Connection
    C1->>Coord: msg: request-port (Client1_ID)
    Note right of Coord: Maps Client1_ID -> C1 Port
    Coord->>C1: msg: request-port (Client1_ID)
    Note right of C1: Leader acts on request
    C1->>W: msg: start-session (Client1_ID)
    W->>C1: msg: session (Client1_ID, Ports)
    C1->>Coord: msg: provide-port (Client1_ID, Ports)
    Coord->>C1: msg: provide-port (Client1_ID, Ports)
    Note right of C1: Client 1 Services Connected

    Note over C2, W: 3. Client 2 Connection
    C2->>Coord: Connect
    C2->>C2: Request Leader Lock (Waits/Fails)
    loop Polling
        C2->>Coord: msg: request-port (Client2_ID)
    end
    Note right of Coord: Maps Client2_ID -> C2 Port
    Coord->>C1: msg: request-port (Client2_ID)
    Note right of C1: Leader acts on request
    C1->>W: msg: start-session (Client2_ID)
    W->>C1: msg: session (Client2_ID, Ports)
    C1->>Coord: msg: provide-port (Client2_ID, Ports)
    Coord->>C2: msg: provide-port (Client2_ID, Ports)
    Note right of C2: Client 2 Services Connected
```
