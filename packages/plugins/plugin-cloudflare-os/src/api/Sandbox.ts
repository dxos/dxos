//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import CAPNWEB_BUNDLE from 'capnweb?raw';

/**
 * The gadget page's policy, as the Workshop sets it (`GadgetUI.tsx`): scripts only from `data:` and
 * inline, and no network at all, so the gadget reaches its server solely through the parent's port.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "frame-src 'none'",
  "script-src data: 'unsafe-inline'",
  "style-src data: 'unsafe-inline'",
  'img-src data:',
  'media-src data:',
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "connect-src 'none'",
].join('; ');

/** The `sandbox` attribute of the gadget frame: scripts and user-opened links, and a null origin. */
export const SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox';

/** Sent by the frame with its `MessagePort` once the gadget's script starts. */
export const HANDSHAKE = 'handshake';

// Base64 needs ASCII; capnweb's build keeps its dist bundle ASCII-only.
const CAPNWEB_MODULE = `data:text/javascript;charset=utf-8;base64,${btoa(`//# sourceURL=capnweb.js\n${CAPNWEB_BUNDLE}`)}`;

/**
 * Runs before the gadget's own code: opens the Cap'n Web session to the parent over a fresh
 * `MessageChannel` and exposes it as `gadget`, the global the gadget code is written against.
 */
const PRELUDE = `//# sourceURL=client.js
import { RpcTarget, RpcStub, newMessagePortRpcSession } from "${CAPNWEB_MODULE}";
let gadget;
{
  const { port1, port2 } = new MessageChannel();
  window.parent.postMessage("${HANDSHAKE}", "*", [port2]);
  gadget = newMessagePortRpcSession(port1);
}
window.open = () => null;
`;

/** The document a gadget frame loads through `srcdoc`: the policy, the prelude and the gadget's code. */
export const gadgetHtml = (jsCode: string): string =>
  [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}">`,
    '</head>',
    '<body>',
    `<script type="module" src="data:text/javascript;charset=utf-8,${encodeURIComponent(PRELUDE + jsCode)}"></script>`,
    '</body>',
    '</html>',
  ].join('\n');
