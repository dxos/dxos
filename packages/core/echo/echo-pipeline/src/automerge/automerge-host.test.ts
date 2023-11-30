import { describe, test } from "@dxos/test";
import { AutomergeHost } from "./automerge-host";
import expect from 'expect';

describe('AutomergeHost', () => {
  test('can create documents', () => {
    const host = new AutomergeHost();

    const handle = host.repo.create<any>();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });

    expect(handle.docSync().text).toEqual('Hello world');
  })
});