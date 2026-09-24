//
// Copyright 2026 DXOS.org
//

/**
 * Control messages between the RTC handover e2e page and its worker. Structured-clone shapes only;
 * `start` transfers the `MessagePort` carrying the page's `RtcService`.
 */

export type ProxyWorkerRequest = { type: 'start'; port: MessagePort } | { type: 'send'; peer: 'a' | 'b'; data: string };

export type ProxyWorkerResponse =
  | { type: 'connected' }
  | { type: 'received'; peer: 'a' | 'b'; data: string }
  | { type: 'error'; message: string };
