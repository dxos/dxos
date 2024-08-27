//
// Copyright 2023 DXOS.org
//

import { type DID } from 'iso-did/types';
import React, { useCallback, useMemo, useState } from 'react';

import { type ScriptType } from '@braneframe/types';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { createDocAccessor, getMeta, getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { createDataExtensions, listener } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { Toolbar } from './Toolbar';
import { TypescriptEditor } from './TypescriptEditor';
import {
  getUserFunctionUrlInMetadata,
  publicKeyToDid,
  setUserFunctionUrlInMetadata,
  uploadWorkerFunction,
} from '../edge';
import { SCRIPT_PLUGIN } from '../meta';

export type ScriptEditorProps = {
  script: ScriptType;
  role?: string;
};

export const ScriptEditor = ({ script, role }: ScriptEditorProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const client = useClient();
  const identity = useIdentity();
  const space = getSpace(script);
  const extensions = useMemo(
    () => [
      listener({
        onChange: (text) => {
          if (script.source && script.source?.content !== text) {
            script.changed = true;
          }
        },
      }),
      createDataExtensions({
        id: script.id,
        text: script.source && createDocAccessor(script.source, ['content']),
        space,
        identity,
      }),
    ],
    [script, script.source, space, identity],
  );
  const initialValue = useMemo(() => script.source?.content, [script.source]);
  const existingFunctionUrl = getUserFunctionUrlInMetadata(getMeta(script));
  const [error, setError] = useState<string>();

  const handleBindingChange = useCallback(
    (binding: string) => {
      script.binding = binding;
    },
    [script],
  );

  const handleDeploy = useCallback(async () => {
    if (!script.source || !identity) {
      return;
    }

    setError(undefined);

    try {
      const existingFunctionId = existingFunctionUrl?.split('/').at(-1);
      const ownerDid = (existingFunctionUrl?.split('/').at(-2) as DID) ?? publicKeyToDid(identity.identityKey);

      const { result, functionId, functionVersionNumber, errorMessage } = await uploadWorkerFunction({
        clientConfig: client.config,
        halo: client.halo,
        ownerDid,
        functionId: existingFunctionId,
        name: script.name,
        source: script.source.content,
      });
      if (result !== 'success' || functionId === undefined) {
        throw new Error(errorMessage);
      }
      log.info('function uploaded', { functionId, functionVersionNumber });
      const meta = getMeta(script);
      setUserFunctionUrlInMetadata(meta, `/${ownerDid}/${functionId}`);
      script.changed = false;
    } catch (err: any) {
      log.catch(err);
      setError(t('upload failed label'));
    }
  }, [existingFunctionUrl, script, script.name, script.source]);

  return (
    <div role='none' className={mx(role === 'article' && 'row-span-2', 'is-full pli-2')}>
      <Toolbar
        binding={script.binding ?? ''}
        onBindingChange={handleBindingChange}
        deployed={Boolean(existingFunctionUrl) && !script.changed}
        onDeploy={handleDeploy}
        functionUrl={existingFunctionUrl}
        error={error}
      />
      <TypescriptEditor id={script.id} initialValue={initialValue} extensions={extensions} />
    </div>
  );
};

export default ScriptEditor;
