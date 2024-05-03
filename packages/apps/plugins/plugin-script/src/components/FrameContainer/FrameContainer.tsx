//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { clientServiceBundle } from '@dxos/client-protocol';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { baseSurface, mx } from '@dxos/react-ui-theme';
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
  const sourceHash = Buffer.from(result.sourceHash).toString('hex');
  const src = result.bundle && `${containerUrl}?ts=${sourceHash}#code=${encodeURIComponent(result.bundle)}`;

  return (
    <>
      <iframe ref={iframeRef} sandbox='allow-scripts' src={src} style={{ width: '100%', height: '100%' }} />

      {debug && (
        <div className='relative'>
          <div
            className={mx(
              baseSurface,
              'flex absolute right-2 bottom-2 w-[400px] h-[200px] ring rounded',
              'z-[100] overflow-x-hidden overflow-y-auto',
            )}
          >
            <pre className='text-xs whitespace-break-spaces break-all p-2'>
              {JSON.stringify(
                {
                  timestamp: result.timestamp,
                  sourceHash,
                  error: result.error,
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
