import { assertParameter } from '@dxos/protocols';
import { isEchoObject, type ReactiveEchoObject } from './create';
import { getObjectCore } from './echo-handler';
import { next as am, type Doc, type State } from '@dxos/automerge/automerge';

export const getEditHistory = (object: ReactiveEchoObject<any>): State<any>[] => {
  assertParameter('object', isEchoObject(object), 'ECHO object stored in the database');

  const objectCore = getObjectCore(object);
  const doc = objectCore.getDoc();
  const changes = am.getHistory(doc as Doc<any>);
  return changes;
};
