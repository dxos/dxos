//
// Copyright 2020 DXOS.org
//

import { DevtoolsContext } from '@dxos/client';
import { Stream } from '@dxos/codec-protobuf';
import { SubscribeToItemsResponse } from '@dxos/devtools';

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
    data: JSON.stringify(res)
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
