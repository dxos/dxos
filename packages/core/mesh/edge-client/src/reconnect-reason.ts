//
// Copyright 2026 DXOS.org
//

/**
 * Why a websocket restart was required. A bounded enum, never a raw message: this is a metric
 * attribute, and one unbounded value would mint a new time series per distinct error string.
 */
export type ReconnectReason =
  /** The browser reports no network. The clearest "lost the internet" signal available. */
  | 'offline'
  /** Closed with 1006 — no close frame arrived, so the connection died rather than being closed. */
  | 'abnormal'
  /** Server closed deliberately and cleanly. */
  | 'normal'
  /** Server is going away or restarting (1001, 1012, 1013). */
  | 'going_away'
  /** Server-side failure (1011, 1014, 1015). */
  | 'server_error'
  /** Closed on policy or protocol grounds (1002, 1003, 1007, 1008, 1009, 1010). */
  | 'policy'
  /** Application close code, which EDGE uses for auth rejection. */
  | 'app'
  /** Socket-level error rather than a close frame — TLS, DNS, refused connect. */
  | 'socket_error'
  /** Keepalive watchdog fired: pings were flowing and the loop was live, but the peer went silent. */
  | 'inactivity_timeout'
  /** The local identity changed, so the socket was torn down deliberately. */
  | 'identity_changed'
  | 'other';

/**
 * Classifies a close event.
 * `online` is checked first: a 1006 while the browser is offline is a lost network, not a server
 * fault, and conflating the two makes the metric useless for exactly the question it is asked.
 */
export const classifyCloseCode = (code: number | undefined, online: boolean | undefined): ReconnectReason => {
  if (online === false) {
    return 'offline';
  }
  if (code === undefined) {
    return 'other';
  }
  if (code >= 4000) {
    return 'app';
  }

  switch (code) {
    case 1000:
      return 'normal';
    case 1001:
    case 1012:
    case 1013:
      return 'going_away';
    case 1006:
      return 'abnormal';
    case 1011:
    case 1014:
    case 1015:
      return 'server_error';
    case 1002:
    case 1003:
    case 1007:
    case 1008:
    case 1009:
    case 1010:
      return 'policy';
    default:
      return 'other';
  }
};

/** Classifies a socket-level error, which carries no close code. */
export const classifySocketError = (online: boolean | undefined): ReconnectReason =>
  online === false ? 'offline' : 'socket_error';

/** Reads `navigator.onLine` where available; `undefined` outside a browser-like realm. */
export const isOnline = (): boolean | undefined => {
  const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
  return typeof nav?.onLine === 'boolean' ? nav.onLine : undefined;
};
