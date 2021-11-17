//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';

import { DevtoolsHook, DevtoolsServiceDependencies } from './devtools-context';
import { SubscribeToItemsResponse } from '../proto/gen/dxos/devtools';

const getData = (echo: DevtoolsHook['client']['echo']): SubscribeToItemsResponse => {
  const result: any = {
    parties: []
  }

  const { value: parties } = echo.queryParties();
  for (const party of parties) {
    const partyInfo: any = {
      key: party.key.toHex(),
      items: []
    };

    const items = party.database.select(selection => selection.items).getValue();
    for (const item of items) {
      partyInfo.items.push({
        id: item.id,
        type: item.type,
        modelType: item.model._meta.type, // TODO(burdon): Private.
        modelName: Object.getPrototypeOf(item.model).constructor.name
      });
    }

    result.parties.push(partyInfo);
  }

  return {
    data: JSON.stringify(result)
  };
}

export const subscribeToItems = (hook: DevtoolsServiceDependencies) => {
  return new Stream<SubscribeToItemsResponse>(({ next }) => {
    const echo = hook.echo;
    const update = () => {
      const res = getData(echo);
      next(res);
    };

    setImmediate(async () => {
      const partySubscriptions: any[] = [];
      echo.queryParties().subscribe((parties) => {
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

    // TODO(yivlad): Add cleanup logic.
  });
};
