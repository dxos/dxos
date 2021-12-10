//
// Copyright 2020 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { SubscriptionGroup } from '@dxos/util';

import { SubscribeToPartiesResponse } from '../proto/gen/dxos/devtools';
import { DevtoolsServiceDependencies } from './devtools-context';

export const subscribeToParties = ({ echo }: DevtoolsServiceDependencies) => {
  return new Stream<SubscribeToPartiesResponse>(({ next }) => {
    const update = () => {
      const { value: parties } = echo.queryParties();
      next({ parties: parties.map(party => party.toJSON()) });
    };

    const subscriptions = new SubscriptionGroup();
    const unsubscribe = echo.queryParties().subscribe((parties) => {
      parties.forEach((party) => {
        if (!subscriptions.subscriptionExists(party.key.toHex())) {
          // Send updates on party changes.
          subscriptions.push(
            party.timeframeUpdate.on(() => update()),
            party.key.toHex()
          );
        }
      });

      // Send new parties.
      update();
    });
    subscriptions.push(unsubscribe, 'partiesQuery');

    // Send initial parties.
    update();

    return () => subscriptions.unsubscribe();
  });
};
