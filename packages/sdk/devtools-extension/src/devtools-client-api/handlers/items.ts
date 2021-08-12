//
// Copyright 2020 DXOS.org
//

import Bridge, { Stream } from 'crx-bridge';
import { HandlerProps } from "./handler-props";

function getData (echo: any) {
  // TODO(marik-d): Display items hierarchically
  const res: Record<string, any> = {};
  const parties = echo.queryParties().value;
  for (const party of parties) {
    const partyInfo: Record<string, any> = {};
    res[`Party ${party.key.toHex()}`] = partyInfo;

    const items = party.database.queryItems().value;
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

  return res;
}

async function subscribeToEcho (client: any, stream: Stream) {
  function update () {
    try {
      const res = getData(client.echo);
      stream.send(res);
    } catch (err) {
      console.error('DXOS DevTools: Items update error');
      console.error(err);
    }
  }

  try {
    await client.initialize();
    const partySubscriptions: any[] = [];

    const unsubscribe = client.echo.queryParties().subscribe((parties: any) => {
      partySubscriptions.forEach(unsub => unsub());

      for (const party of parties) {
        const sub = party.database.queryItems().subscribe(() => {
          update();
        });
        partySubscriptions.push(sub);
      }
      update();
    });

    stream.onClose(() => {
      partySubscriptions.forEach(unsub => unsub());
      unsubscribe();
    });

    update();
  } catch (e) {
    console.error('DXOS DevTools: Items handler failed to subscribe to echo.');
    console.error(e);
  }
}

export default ({ hook, bridge }: {hook: any, bridge: typeof Bridge }) => {
  bridge.onOpenStreamChannel('echo.items', (stream) => {
    subscribeToEcho(hook.client, stream);
  });
};
