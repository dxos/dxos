//
// Copyright 2023 DXOS.org
//

import { Warning } from '@phosphor-icons/react';
import { type Message } from 'esbuild';
import React, { useEffect, useRef, useState } from 'react';

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
  const [runtimeErrors, setRuntimeErrors] = useState<Message[]>([]);

  useEffect(() => {
    console.log('clear');
    setRuntimeErrors([]);
  }, [result]);

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

  useEffect(() => {
    if (iframeRef.current) {
      const handler: OnErrorEventHandler = (msg, url, line, col, err) => {
        setRuntimeErrors((runtimeErrors) => [...runtimeErrors, decodeRuntimeError(msg, url, line, col, err)]);
      };

      iframeRef.current.contentWindow?.addEventListener('error', handler);

      return () => {
        iframeRef.current?.contentWindow?.removeEventListener('error', handler);
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

  if (result.errors.length > 0 || runtimeErrors.length > 0) {
    return (
      <div>
        {result.errors.map((error, index) => (
          <DiagnosticMessage key={index} message={error} kind={'error'} />
        ))}
        {runtimeErrors.map((error, index) => (
          <DiagnosticMessage key={index} message={error} kind={'error'} />
        ))}
        {result.warnings.map((warning, index) => (
          <DiagnosticMessage key={index} message={warning} kind={'warning'} />
        ))}
      </div>
    );
  }

  return (
    <>
      <iframe
        ref={iframeRef}
        sandbox='allow-scripts allow-same-origin'
        src={src}
        style={{ width: '100%', height: '100%' }}
      />

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

const DiagnosticMessage = ({ message, kind }: { message: Message; kind: 'error' | 'warning' }) => {
  return (
    <div className='flex flex-row gap-2'>
      <Warning />
      <div className='whitespace-pre text-xs'>
        <div className='font-bold'>
          <span className='uppercase'>{kind} </span>
          {message.location && (
            <span>
              {message.location.file}:{message.location.line}:{message.location.column}
            </span>
          )}
        </div>
        <div>{message.text}</div>
        {message.detail instanceof Error && <div>{message.detail.message}</div>}
        {message.notes.length > 0 && (
          <div className=''>
            {message.notes.map((note, index) => (
              <div key={index}>{note.text}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const decodeRuntimeError = (...[msg, url, line, col, err]: Parameters<OnErrorEventHandlerNonNull>): Message => {
  const message: Message = {
    id: '',
    text: typeof msg === 'string' ? msg : (msg as any).message,
    location: null,
    notes: [],
    pluginName: 'runtime',
    detail: err,
  };

  if (typeof url === 'string' && !!url) {
    message.location = {
      namespace: '',
      file: url ?? '',
      line: line ?? 0,
      column: col ?? 0,
      length: 0,
      lineText: '',
      suggestion: '',
    };
  }

  return message;
};
