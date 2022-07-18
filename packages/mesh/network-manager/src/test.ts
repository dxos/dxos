import { PublicKey } from "@dxos/protocols";
import { NewSignalClient } from "./signal/new-client";

async function main() {
  const client = new NewSignalClient('wss://pcarrier.gh.srv.us/ws')

  await client.open();

  const topic = PublicKey.random()
  const peerId1 = PublicKey.fromHex('0x11111111111111111111111111')
  const peerId2 = PublicKey.fromHex('0x22222222222222222222222222')
  await Promise.all([
    client.join(topic, peerId1),
    client.join(topic, peerId2),
  ])
}

main()