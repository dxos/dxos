import { PublicKey } from '@dxos/protocols';
import { afterTest } from '@dxos/testutils';
import { createTestBroker, TestBroker } from "@dxos/signal";
import waitForExpect from "wait-for-expect";
import { Messenger } from "./messenger";
import { Any } from "./proto/gen/google/protobuf";
import { SignalManagerImpl } from "./signal-manager-impl";
import { expect } from 'earljs';



describe('Messenger', () => {
  let broker: TestBroker;

  before(async () => {
    broker = await createTestBroker();
  });

  after(() => {
    broker.stop();
  });


  const setup = (): {messenger: Messenger, received: [author: PublicKey, payload: Any][]} => {
    const received: [author: PublicKey, payload: Any][] = [];
    const receiveMock = async (author: PublicKey, payload: Any) => { received.push([author, payload]) };
    const signalManager =  new SignalManagerImpl([broker.url()]);
    afterTest(() => signalManager.close());

    const messenger = new Messenger({
      ownPeerId: PublicKey.random(),
      receive: receiveMock,
      signalManager: signalManager
    })

    return {
      messenger,
      received
    }
  };

  it.only('Message between peers', async () => {
    const {messenger: messenger1, received: received1} = setup();
    const {messenger: messenger2, received: received2} = setup();

    const payload: Any = {
      type_url: 'a',
      value: Buffer.from('0')
    } 

    messenger1.message(messenger2.ownPeerId, payload);

    await waitForExpect(() => {
      expect(received2[0]).toEqual([messenger1.ownPeerId, payload])
    });

  });
});