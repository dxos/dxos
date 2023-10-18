//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { clientServiceBundle } from '@dxos/client-protocol';
import { useClient } from '@dxos/react-client';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { type Frame } from '../../proto';

// import frameSrc from './frame.html?raw';
// import mainUrl from './main?url';

export type EmbeddedFrameProps = {
  frame: Frame;
};

export const FrameContainer = ({ frame }: EmbeddedFrameProps) => {
  /*
  const code = frame.compiled?.bundle ?? 'throw new Error("No bundle")';
  const html = frameSrc.replace(
    // eslint-disable-next-line no-template-curly-in-string
    '${importMap}',
    JSON.stringify({
      imports: {
        // TODO(burdon): Change namespace (separate GH domain).
        '@frame/main': mainUrl,
        '@frame/bundle': `data:text/javascript;base64,${btoa(code)}`,
        ...Object.fromEntries(
          frame.compiled?.imports
            ?.filter((entry) => !entry.moduleUrl!.startsWith('http'))
            .map((entry) => [entry.moduleUrl!, createReexportingModule(entry.namedImports!, entry.moduleUrl!)]) ?? []
        )
      }
    })
  );
  */

  const html = '<div>NOT IMPLEMENTED</div>';

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const client = useClient();
  useEffect(() => {
    if (iframeRef.current) {
      const port = createIFramePort({
        channel: 'frame',
        iframe: iframeRef.current,
        origin: '*',
      });

      const rpc = createProtoRpcPeer({
        port,
        exposed: clientServiceBundle,
        handlers: (client as any)._services.services,
      });

      rpc.open().catch(console.error);
      return () => {
        rpc.close().catch(console.error);
      };
    }
  }, [iframeRef]);

  return <iframe style={{ width: '100%', height: '100%' }} ref={iframeRef} srcDoc={html} sandbox='allow-scripts' />;
};

/*
const createReexportingModule = (namedImports: string[], key: string) => {
  const code = `
    const { ${namedImports.join(',')} } = window.__DXOS_SANDBOX_MODULES__[${JSON.stringify(key)}];
    export { ${namedImports.join(',')} }
    export default window.__DXOS_SANDBOX_MODULES__[${JSON.stringify(key)}].default;
  `;

  return `data:text/javascript;base64,${btoa(code)}`;
};
*/
