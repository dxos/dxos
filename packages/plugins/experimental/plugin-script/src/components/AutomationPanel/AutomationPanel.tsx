import type { EchoReactiveObject } from '@dxos/client/echo';
import { useClient } from '@dxos/react-client';
import { Filter, getMeta, getSpace, useQuery } from '@dxos/react-client/echo';
import React, { useMemo, useState } from 'react';
import { getInvocationUrl, getUserFunctionUrlInMetadata } from '../../edge';
import { FunctionType, ScriptType } from '../../types';
import { DebugPanel } from '../DebugPanel';

export interface AutomationPanelProps {
  subject: EchoReactiveObject<any>;
}

export const AutomationPanel = ({ subject }: AutomationPanelProps) => {
  const client = useClient();
  const [script, setScript] = useState<ScriptType | null>(subject instanceof ScriptType ? subject : null);
  const space = script && getSpace(script);

  // TODO(dmaretskyi): Parametric query.
  const [fn] = useQuery(
    space ?? undefined,
    Filter.schema(FunctionType, (fn) => fn.source === script),
  );
  const existingFunctionUrl = fn && getUserFunctionUrlInMetadata(getMeta(fn));
  const functionUrl = useMemo(() => {
    if (!existingFunctionUrl) {
      return;
    }

    return getInvocationUrl(existingFunctionUrl, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: space?.id,
      subjectId: subject?.id,
    });
  }, [existingFunctionUrl, space, subject]);

  return <DebugPanel functionUrl={functionUrl} classNames='h-full' />;
};
