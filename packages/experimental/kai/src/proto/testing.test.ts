import { Client, fromHost } from "@dxos/client";
import { test } from "@dxos/test";
import { Generator } from "./testing";

test.only('generate test data', async () => {
  const client = new Client({
    services: fromHost()
  });
  await client.initialize();
  await client.halo.createProfile();
  const space = await client.echo.createSpace();
  const generator = new Generator(space.experimental.db);
  console.log('generating data...');
  await generator.generate();
})