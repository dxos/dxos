import { describe, test } from "@dxos/test";
import { expect } from "chai";
import * as Y from 'yjs'

describe('yjs', () => {
  test('basic', () => {
    const ydoc = new Y.Doc()
    const yarray = ydoc.getArray('a') 

    yarray.insert(0, [1, 2, 3]) // insert three elements
    yarray.delete(1, 1) // delete second element 
    expect(yarray.toArray()).to.deep.equal([1, 3])
  })

  test('send as snapshot', () => {
    const ydoc1 = new Y.Doc()
    const yarray1 = ydoc1.getArray('a') 
    yarray1.insert(0, [1, 2])

    const snapshot = Y.encodeStateAsUpdateV2(ydoc1)

    const ydoc2 = new Y.Doc()
    Y.applyUpdateV2(ydoc2, snapshot)
    const yarray2 = ydoc1.getArray('a') 
    expect(yarray2.toArray()).to.deep.equal([1, 2])
  })

  test('incremental updates', () => {
    const ydoc1 = new Y.Doc()
    const ydoc2 = new Y.Doc()
    ydoc1.on('updateV2', (update, origin) => {
      Y.applyUpdateV2(ydoc2, update)
    })
    
    const yarray1 = ydoc1.getArray('a') 
    const yarray2 = ydoc2.getArray('a') 

    yarray1.insert(0, [1, 2])
    expect(yarray2.toArray()).to.deep.equal([1, 2])
  })

  test('apply update to different instance', () => {
    const ydoc1 = new Y.Doc()
    const ydoc2 = new Y.Doc()
    const yarray1 = ydoc1.getArray('a') 
    const yarray2 = ydoc2.getArray('a') 

    // peer1 = [1]
    yarray1.insert(0, [1])

    // peer2 = [2]    
    yarray2.insert(0, [2])

    // Enable replication
    ydoc1.on('updateV2', (update, origin) => {
      Y.applyUpdateV2(ydoc2, update)
    })

    // peer1.push(3)
    yarray1.push([3])

    expect(yarray2.toArray()).to.deep.equal([2]) // Push 3 is discarded when array is reset
  })
})