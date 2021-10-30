//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { DevtoolsContext } from '..';
import { SubscribeToItemsResponse } from '../proto/gen/dxos/devtools';

function getData (echo: DevtoolsContext['client']['echo']): SubscribeToItemsResponse {
  // TODO(marik-d): Display items hierarchically
  const res: Record<string, any> = {};
  const parties = echo.queryParties().value;
  for (const party of parties) {
    const partyInfo: Record<string, any> = {};
    res[`Party ${party.key.toHex()}`] = partyInfo;

    const items = party.database.select(s => s.items).getValue();
    for (const item of items) {
      const modelName = Object.getPrototypeOf(item.model).constructor.name;
      partyInfo[`${modelName} ${item.type} ${item.id}`] = {
        id: item.id,
        type: item.type,
        modelType: item.model._meta.type,
        modelName
      };
    }
  }

  return {
    data: Object.keys(res).length !== 0 ? JSON.stringify(res) : undefined
  };
}

export const subscribeToItems = (hook: DevtoolsContext) => {
  return new Stream<SubscribeToItemsResponse>(({ next }) => {
    const client = hook.client;
    const update = () => {
      const res = getData(client.echo);
      next(res);
    };

    setImmediate(async () => {
      await client.initialize();

      const partySubscriptions: any[] = [];
      client.echo.queryParties().subscribe((parties) => {
        partySubscriptions.forEach(unsub => unsub());

        for (const party of parties) {
          const sub = party.database.select(s => s.items).update.on(() => {
            update();
          });
          partySubscriptions.push(sub);
        }
        update();
      });

      update();
    });

    // TODO(yivlad): Add cleanup logic
  });
};
