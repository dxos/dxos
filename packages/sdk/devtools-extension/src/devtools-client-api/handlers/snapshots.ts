//
// Copyright 2020 DXOS.org
//

import Bridge, { Stream } from 'crx-bridge';
import { HandlerProps } from "./handler-props";

function getData (client: any) {
  return Promise.all(
    client.echo.queryParties().value.map(async (party: any) => {
      const snapshot = await client.echo._snapshotStore.load(party.key);
      if (!snapshot) {
        return undefined;
      }

      // TODO(marik-d): Send this snapshot protobuf encoded.
      return {
        partyKey: snapshot.partyKey,
        timestamp: snapshot.timestamp,
        halo: snapshot.halo,
        itemCount: snapshot.database.items?.length
      };
    })
  );
}

async function subscribeToEcho (client: any, stream: Stream) {
  async function update () {
    try {
      const res = await getData(client);
      console.log(res);
      stream.send(res);
    } catch (err) {
      console.error('DXOS DevTools: Snapshots update error');
      console.error(err);
    }
  }

  try {
    await client.initialize();
    const unsubscribe = client.echo.queryParties().subscribe(() => {
      update();
    });

    stream.onClose(() => {
      unsubscribe();
    });

    update();
  } catch (e) {
    console.error('DXOS DevTools: Snapshots handler failed to subscribe to echo.');
    console.error(e);
  }
}

export default ({ hook, bridge }: HandlerProps) => {
  bridge.onOpenStreamChannel('echo.snapshots', (stream) => {
    subscribeToEcho(hook.client, stream);
  });
};
