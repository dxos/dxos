//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { SubscriptionGroup } from '@dxos/util';

import { SubscribeToItemsResponse } from '../proto/gen/dxos/devtools';
import { DevtoolsServiceDependencies } from './devtools-context';

const getData = (echo: DevtoolsServiceDependencies['echo']): SubscribeToItemsResponse => {
  const result: any = {
    parties: []
  };

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
};

export const subscribeToItems = ({ echo }: DevtoolsServiceDependencies) => {
  return new Stream<SubscribeToItemsResponse>(({ next }) => {
    const update = () => {
      const res = getData(echo);
      next(res);
    };

    const subscriptions = new SubscriptionGroup();
    const unsubscribe = echo.queryParties().subscribe((parties) => {
      parties.forEach(party => {
        if (!subscriptions.subscriptionExists(party.key.toHex())) {
          const unsubscribe = party.database.select(selection => selection.items).update.on(() => {
            // Send updates on items changes.
            update();
          });
          subscriptions.push(unsubscribe, party.key.toHex());
        }
      });

      // Send items for new parties.
      update();
    });
    subscriptions.push(unsubscribe, 'partiesQuery');

    // Send initial items.
    update();

    return () => subscriptions.unsubscribe();
  });
};
