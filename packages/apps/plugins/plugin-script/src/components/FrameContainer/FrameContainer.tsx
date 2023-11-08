//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { clientServiceBundle } from '@dxos/client-protocol';
import { useClient } from '@dxos/react-client';
import { mx } from '@dxos/react-ui-theme';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { type CompilerResult } from '../../compiler';

export type FrameContainerProps = {
  containerUrl: string;
  result: CompilerResult;
  debug?: boolean;
};

/**
 * IFrame container for the compiled script.
 */
export const FrameContainer = ({ containerUrl, result, debug = false }: FrameContainerProps) => {
  const client = useClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (iframeRef.current) {
      // Connect iframe to client.
      const rpc = createProtoRpcPeer({
        exposed: clientServiceBundle,
        handlers: (client as any)._services.services, // TODO(burdon): Remove cast?
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

  // Encodes compiled code via URL.
  const sourceHash = Buffer.from(result.sourceHash).toString('hex');
  const src = `${containerUrl}?ts=${sourceHash}#importMap=${encodeURIComponent(
    JSON.stringify({
      imports: createImportMap(result),
    }),
  )}`;

  return (
    <>
      <iframe ref={iframeRef} sandbox='allow-scripts' src={src} style={{ width: '100%', height: '100%' }} />

      {debug && (
        <div className='relative'>
          <div
            className={mx(
              'flex absolute right-2 bottom-2 w-[400px] h-[200px] ring rounded bg-white',
              'z-[100] overflow-x-hidden overflow-y-auto',
            )}
          >
            <pre className='text-xs whitespace-break-spaces break-all p-2'>
              {JSON.stringify(
                {
                  timestamp: result.timestamp,
                  sourceHash,
                  src,
                },
                undefined,
                2,
              )}
            </pre>
          </div>
        </div>
      )}
    </>
  );
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
      const __$module = window.__DXOS_SANDBOX_MODULES__.resolve(${JSON.stringify(key)});
      const { ${namedImports.join(',')} } = __$module;
      export { ${namedImports.join(',')} };
      export default __$module.default;
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
