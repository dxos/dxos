//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { clientServiceBundle } from '@dxos/client-protocol';
import { useClient } from '@dxos/react-client';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { type CompilerResult } from '../../compiler';

export type FrameContainerProps = {
  containerUrl: string;
  result: CompilerResult;
};

/**
 * IFrame container for the compiled script.
 */
export const FrameContainer = ({ containerUrl, result }: FrameContainerProps) => {
  const client = useClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (iframeRef.current) {
      // Connect iframe to client.
      const rpc = createProtoRpcPeer({
        exposed: clientServiceBundle,
        handlers: (client as any)._services.services, // TODO(burdon): Remove cast.
        port: createIFramePort({
          channel: 'frame',
          iframe: iframeRef.current,
          origin: '*',
        }),
      });

      rpc.open().catch(console.error);
      return () => {
        rpc.close().catch(console.error);
      };
    }
  }, [iframeRef]);

  const src = `${containerUrl}#importMap=${encodeURIComponent(
    JSON.stringify({
      imports: createImportMap(result),
    }),
  )}`;

  // return (
  //   <pre className='text-xs p-2 whitespace-break-spaces'>
  //     <code>{html}</code>
  //   </pre>
  // );

  return <iframe ref={iframeRef} sandbox='allow-scripts' src={src} style={{ width: '100%', height: '100%' }} />;
};

/**
 * Create import map used to resolve modules in the browser.
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
 * @param mainUrl
 * @param result
 */
const createImportMap = (result: CompilerResult) => {
  const createReexportingModule = (namedImports: string[], key: string) => {
    const code = `
      const { ${namedImports.join(',')} } = window.__DXOS_SANDBOX_MODULES__[${JSON.stringify(key)}];
      export { ${namedImports.join(',')} };
      export default window.__DXOS_SANDBOX_MODULES__[${JSON.stringify(key)}].default;
    `;

    return `data:text/javascript;base64,${btoa(code)}`;
  };

  return {
    '@frame/bundle': `data:text/javascript;base64,${btoa(result.bundle)}`,
    ...Object.fromEntries(
      result.imports
        ?.filter((entry) => !entry.moduleUrl!.startsWith('http'))
        .map((entry) => [entry.moduleUrl!, createReexportingModule(entry.namedImports!, entry.moduleUrl!)]) ?? [],
    ),
  };
};
