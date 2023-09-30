import * as automerge from "@automerge/automerge"
import { describe, test } from "@dxos/test"
import { inspect } from "util"

describe.only('Automerge', () => {
  test('example', () => {

    type DocType = { ideas: Array<automerge.Text> }

    let doc1 = automerge.init<DocType>()
    doc1 = automerge.change(doc1, d => {
      d.ideas = [new automerge.Text("an immutable document")]
    })

    let doc2 = automerge.init<DocType>()
    doc2 = automerge.merge(doc2, automerge.clone(doc1))
    doc2 = automerge.change<DocType>(doc2, d => {
      d.ideas.push(new automerge.Text("which records its history"))
    })

    // Note the `automerge.clone` call, see the "cloning" section of this readme for
    // more detail
    doc1 = automerge.merge(doc1, automerge.clone(doc2))
    doc1 = automerge.change(doc1, d => {
      d.ideas[0].deleteAt(13, 8)
      d.ideas[0].insertAt(13, "object")
    })

    let doc3 = automerge.merge(doc1, doc2)

    console.log(doc3)
    console.log(inspect(automerge.getHistory(doc3), false, null, true))
    console.log(automerge.getAllChanges(doc3))
  })
})