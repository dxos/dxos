import { invariant } from "@dxos/invariant";
import { EchoObject, base } from "../object";
import { AutomergeObject } from "./automerge-object";
import { Hypergraph } from "../hypergraph";
import { Repo as AutomergeRepo, DocHandle } from '@automerge/automerge-repo'

export class AutomergeDb {

  private readonly _repo: AutomergeRepo;
  private readonly _docHandle: DocHandle<any>;

  constructor(
    public readonly graph: Hypergraph
  ) {
    this._repo = new AutomergeRepo({
      network: [],
    })
    this._docHandle = this._repo.create();
  }

  /**
   * @internal
   */
  readonly _objects = new Map<string, EchoObject>();

  getObjectById(id: string): EchoObject | undefined {
    return this._objects.get(id);
  }

  add<T extends EchoObject>(obj: T): T {
    invariant(obj[base] instanceof AutomergeObject)
    invariant(!this._objects.has(obj.id))
    this._objects.set(obj.id, obj);
    (obj[base] as AutomergeObject)._bind({
      db: this,
      docHandle: this._getDocHandle(),
    })  
    return obj
  }
}