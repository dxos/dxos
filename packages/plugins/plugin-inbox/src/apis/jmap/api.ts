//
// Copyright 2026 DXOS.org
//

// Shared JMAP core: session discovery, batched request transport, typed error.
export * from './jmap-api';
// Shared schema primitives used across capabilities (Session, Filter, Response, etc.).
export * from './types';
// Mail-specific API helpers and schemas, also accessible via the JmapMail namespace below.
export * from './JmapMail';
export * as JmapMail from './JmapMail';
