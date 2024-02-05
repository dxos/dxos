import { Doc } from '@dxos/automerge/automerge';
import { AutomergeDb } from './automerge-db';
import { DocHandle } from '@dxos/automerge/automerge-repo';
import { DocStructure, ObjectStructure } from './types';

// TODO(dmaretskyi): Rename to `AutomergeObject`.
export class AutomergeObjectCore {
  public database?: AutomergeDb | undefined;

  /**
   * Set if when the object is not bound to a database.
   */
  public doc?: Doc<ObjectStructure> | undefined;

  /**
   * Set if when the object is bound to a database.
   */
  public docHandle?: DocHandle<DocStructure> = undefined;

  /**
   * Key path at where we are mounted in the `doc` or `docHandle`.
   * The value at path must be of type `ObjectStructure`.
   */
  public mountPath: string[] = [];
}
