//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { clientServiceBundle } from '@dxos/client-protocol';
import { type BundleResult } from '@dxos/functions-runtime/bundler';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { baseSurface, mx } from '@dxos/react-ui-theme';
import { createProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

export type FrameContainerProps = {
  containerUrl: string;
  result: BundleResult;
  debug?: boolean;
};

/**
 * IFrame container for the compiled script.
 */
export const FrameContainer = ({ containerUrl, result, debug = true }: FrameContainerProps) => {
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

      rpc.open().catch((e) => log.catch(e));
      return () => {
        rpc.close().catch((e) => log.catch(e));
      };
    }
  }, [iframeRef]);

  // Encodes compiled code via URL.
  invariant(result.sourceHash, 'Source hash is required.');
  const sourceHash = Buffer.from(result.sourceHash).toString('hex');
  const src =
    'bundle' in result ? `${containerUrl}?ts=${sourceHash}#code=${encodeURIComponent(result.bundle)}` : undefined;

  return (
    <>
      <iframe ref={iframeRef} sandbox='allow-scripts' src={src} style={{ width: '100%', height: '100%' }} />

      {debug && (
        <div className='relative'>
          <div
            className={mx(
              baseSurface,
              'flex absolute right-2 bottom-2 w-[30rem] h-[200px] ring rounded',
              'z-20 overflow-x-hidden overflow-y-auto',
            )}
          >
            <pre className='text-xs whitespace-break-spaces break-all p-2'>
              {JSON.stringify(
                {
                  timestamp: result.timestamp,
                  sourceHash,
                  error: 'error' in result ? result.error : undefined,
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
