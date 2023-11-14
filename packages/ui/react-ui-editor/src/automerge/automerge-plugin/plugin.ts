import {
  Annotation,
  EditorState,
  Extension,
  Facet,
  StateEffect,
  StateField,
  Transaction,
  TransactionSpec,
} from "@codemirror/state"
import * as automerge from "@automerge/automerge"
import { Doc, Heads, Prop } from "@automerge/automerge"
import { PatchSemaphore } from "./PatchSemaphore"
import { EditorView } from "codemirror"
import { DocHandle } from "@automerge/automerge-repo"

export type Value = {
  lastHeads: Heads
  path: Prop[]
  unreconciledTransactions: Transaction[],
}

type UpdateHeads = {
  newHeads: Heads
}

export const effectType = StateEffect.define<UpdateHeads>({})

export function updateHeads(newHeads: Heads): StateEffect<UpdateHeads> {
  return effectType.of({ newHeads })
}

export function getLastHeads(state: EditorState, field: Field): Heads {
  return state.field(field).lastHeads
}

export function getPath(state: EditorState, field: Field): Prop[] {
  return state.field(field).path
}

export type Field = StateField<Value>

const semaphoreFacet = Facet.define<PatchSemaphore, PatchSemaphore>({
  combine: values => values.at(-1)!, // Take last.
});

export function plugin<T>(doc: Doc<T>, path: Prop[]): Extension {
  const stateField: StateField<Value> = StateField.define({
    create() {
      return {
        lastHeads: automerge.getHeads(doc),
        unreconciledTransactions: [],
        path: path.slice(),
      }
    },
    update(value: Value, tr: Transaction) {
      const result: Value = {
        lastHeads: value.lastHeads,
        unreconciledTransactions: value.unreconciledTransactions.slice(),
        path: path.slice(),
      }
      let clearUnreconciled = false
      for (const effect of tr.effects) {
        if (effect.is(effectType)) {
          result.lastHeads = effect.value.newHeads
          clearUnreconciled = true
        }
      }
      if (clearUnreconciled) {
        result.unreconciledTransactions = []
      } else {
        if (!isReconcileTx(tr)) {
          result.unreconciledTransactions.push(tr)
        }
      }
      return result
    },
  });
  const semaphore = new PatchSemaphore(stateField)

  return [
    stateField,
    semaphoreFacet.of(semaphore),
  ]
}


export const reconcileAnnotationType = Annotation.define<unknown>()

export function isReconcileTx(tr: Transaction): boolean {
  return !!tr.annotation(reconcileAnnotationType)
}

export function makeReconcile(tr: TransactionSpec) {
  if (tr.annotations != null) {
    if (tr.annotations instanceof Array) {
      tr.annotations = [...tr.annotations, reconcileAnnotationType.of({})]
    } else {
      tr.annotations = [tr.annotations, reconcileAnnotationType.of({})]
    }
  } else {
    tr.annotations = [reconcileAnnotationType.of({})]
  }
  //return {
  //...tr,
  //annotations: reconcileAnnotationType.of({})
  //}
}

export const reconcile = (handle: DocHandle<any>, view: EditorView) => {
  view.state.facet(semaphoreFacet).reconcile(handle, view)
}
