import { MutationMeta } from "@dxos/echo-protocol";

export interface StateMachine<TState, TMutation, TSnapshot> {
  getState(): TState;
  process(mutation: TMutation, meta: MutationMeta): void;

  snapshot(): TSnapshot;
  reset(snapshot: TSnapshot): void;
}