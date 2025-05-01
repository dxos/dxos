import * as Automerge from '@automerge/automerge';

type Node = {
  type: 'node';
  links: string[];
};

type Leaf = {
  type: 'leaf';
  data: string;
};

type QueueEntry = Node | Leaf;

class Queue {
  docs = new Map<string, Uint8Array>();

  set(id: string, data: string) {
    const leaf = Automerge.from({
      type: 'leaf',
      data,
    });
    this.docs.set(id, Automerge.save(leaf));
  }

  loadLeafDoc(id: string): Automerge.Doc<Leaf> {
    if (!this.docs.has(id)) {
      throw new Error('Document not found');
    }

    const doc = Automerge.load(this.docs.get(id)!) as Automerge.Doc<QueueEntry>;
    if (doc.type !== 'leaf') {
      throw new Error('Document is not a leaf');
    }
    return doc;
  }

  saveLeafDoc(id: string, doc: Automerge.Doc<Leaf>) {
    this.docs.set(id, Automerge.save(doc));
  }
}

const randomString = (length: number) =>
  randomBytes(length / 2 + 1)
    .toString('hex')
    .slice(0, length);
