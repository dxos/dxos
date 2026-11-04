//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { mx } from '@dxos/ui-theme';

import { Sandbox } from '#api';

export type GadgetFrameProps = {
  /** The gadget's UI code, as its bundle returns it. */
  jsCode: string;
  title: string;
  classNames?: string;
  /** Receives the port the gadget opened, to bridge to its server; called again whenever the frame reloads. */
  onConnect: (port: MessagePort) => void;
};

/**
 * Runs a gadget's UI in a sandboxed, null-origin frame with no network access. The only way out is the
 * `MessagePort` the gadget hands over on start, which the caller bridges to the gadget's server.
 */
export const GadgetFrame = ({ jsCode, title, classNames, onConnect }: GadgetFrameProps) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => Sandbox.gadgetHtml(jsCode), [jsCode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // A sandboxed frame's origin is the string "null"; anything else did not come from this frame.
      if (event.source !== frameRef.current?.contentWindow || event.origin !== 'null') {
        return;
      }
      const [port] = event.ports;
      if (event.data === Sandbox.HANDSHAKE && port) {
        onConnect(port);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConnect]);

  return (
    <iframe
      ref={frameRef}
      srcDoc={html}
      sandbox={Sandbox.SANDBOX}
      title={title}
      className={mx('block dx-fill border-none', classNames)}
      data-testid='cloudflare-os.gadget-frame'
    />
  );
};
