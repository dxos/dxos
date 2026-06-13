//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Query } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space';
import { useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Row, RowList } from '@dxos/react-ui-list';
import { Channel } from '@dxos/types';

import { meta } from '#meta';
import { Call, CallOperation } from '#types';

// TODO(wittjosiah): Add a story which renders calls alongside call?

type CallItemProps = {
  call: Call.Call;
  getLabel: (call: Call.Call) => string;
};

const CallItem = ({ call, getLabel }: CallItemProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleSelectCall = useCallback(
    () => invokePromise(CallOperation.SetActive, { object: call }),
    [invokePromise, call],
  );

  return (
    <Row id={call.id} classNames='grid grid-cols-[1fr_auto] items-center'>
      <span className='truncate'>{getLabel(call)}</span>
      <Button onClick={handleSelectCall}>{t('select-meeting.label')}</Button>
    </Row>
  );
};

export type CallsListProps = AppSurface.ArticleProps<undefined, {}, Obj.Unknown>;

export const CallsList = ({ companionTo: channel }: CallsListProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(channel);
  const calls = useQuery(db, Query.type(Call.Call));
  // TODO(wittjosiah): This should be done in the query.
  const sortedCalls = useMemo(() => {
    return calls.toSorted((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }, [calls]);

  const getLabel = useCallback(
    (call: Call.Call) => Obj.getLabel(call) ?? new Date(call.created).toLocaleString(),
    [],
  );

  const handleCreateCall = useCallback(async () => {
    invariant(db);
    const createResult = await invokePromise(CallOperation.Create, { channel: channel as Channel.Channel });
    invariant(Obj.instanceOf(Call.Call, createResult.data?.object));
    const addResult = await invokePromise(SpaceOperation.AddObject, {
      target: db,
      hidden: true,
      object: createResult.data?.object,
    });
    invariant(Obj.instanceOf(Call.Call, addResult.data?.object));
    await invokePromise(CallOperation.SetActive, { object: addResult.data?.object });
  }, [invokePromise, db, channel]);

  return (
    <div>
      <div className='px-2 min-h-[3rem] flex justify-end items-center'>
        <Button onClick={handleCreateCall}>{t('create-meeting.label')}</Button>
      </div>
      <RowList.Root>
        <RowList.Viewport>
          <RowList.Content aria-label={t('meeting-list.label')}>
            {sortedCalls.map((call) => (
              <CallItem key={call.id} call={call} getLabel={getLabel} />
            ))}
          </RowList.Content>
        </RowList.Viewport>
      </RowList.Root>
    </div>
  );
};
