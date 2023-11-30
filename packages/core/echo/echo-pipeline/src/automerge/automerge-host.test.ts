import { describe, test } from "@dxos/test";
import { AutomergeHost } from "./automerge-host";
import expect from 'expect';
import { StorageType, createStorage } from "@dxos/random-access-storage";
import { sleep } from "@dxos/async";
import { log } from "@dxos/log";

describe('AutomergeHost', () => {
  test('can create documents', () => {
    const host = new AutomergeHost(createStorage({ type: StorageType.RAM }).createDirectory());

    const handle = host.repo.create();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    expect(handle.docSync().text).toEqual('Hello world');
  });

  test('changes are preserved in storage', async () => {
    const storageDirectory = createStorage({ type: StorageType.RAM }).createDirectory();

    const host = new AutomergeHost(storageDirectory);
    const handle = host.repo.create();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    const url = handle.url;

    // TODO(dmaretskyi): Is there a way to know when automerge has finished saving?
    await sleep(100);

    const host2 = new AutomergeHost(storageDirectory);
    const handle2 = host2.repo.find(url);
    await handle2.whenReady();
    expect(handle2.docSync().text).toEqual('Hello world');
  })
});