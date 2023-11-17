import { invariant } from "@dxos/invariant";
import { EchoObject, base } from "../object";
import { AutomergeObject } from "./automerge-object";

export class AutomergeDb {
  /**
   * @internal
   */
  readonly _objects = new Map<string, EchoObject>();

  add<T extends EchoObject>(obj: T): T {
    invariant(obj[base] instanceof AutomergeObject)
    invariant(!this._objects.has(obj.id))
    this._objects.set(obj.id, obj)
    return obj
  }
}