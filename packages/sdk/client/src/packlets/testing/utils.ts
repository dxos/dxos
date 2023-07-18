import { PublicKey } from "@dxos/keys"
import { Client } from "../client"
import { Space } from "@dxos/client-protocol"
import { Trigger } from "@dxos/async";

type Options = {
  timeout?: number;
  ready?: boolean;
}

export const waitForSpace = async (client: Client, spaceKey: PublicKey, { timeout = 500, ready }: Options = {}): Promise<Space> => {
  let space = client.getSpace(spaceKey);

  if (!space) {
    const spaceTrigger = new Trigger<Space>();
    const sub = client.spaces.subscribe(() => {
      if (client.spaces.get()[0]) {
        sub.unsubscribe();
        spaceTrigger.wake(client.spaces.get()[0]);
      }
    });
    space = await spaceTrigger.wait({ timeout });
  }

  if (ready) {
    await space.waitUntilReady();
  }

  return space;
}