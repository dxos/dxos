import { afterTest } from "@dxos/testutils"
import { sleep } from "@dxos/async"
import { randomBytes } from "crypto"
import { Framer, readFrame } from "./framer"
import { expect } from "chai"
import * as varint from "varint"
import { pipeline } from "stream"
import waitForExpect from 'wait-for-expect'


const pipeWithRandomizedChunks = (from: NodeJS.ReadableStream, to: NodeJS.WritableStream): () => void => {
  let buffers: Buffer[] = []
  from.on('data', data => {
    buffers.push(data)
  })

  // Flush data every 20ms.
  const intervalId = setInterval(() => {
    const buffer = Buffer.concat(buffers)

    // console.log('flushing total', buffer.length)

    let offset = 0;
    while (offset < buffer.length) {
      const chunkLength = Math.min(Math.floor(Math.random() * buffer.length * 1.2) + 1, buffer.length - offset)
      // console.log('flush', chunkLength)
      to.write(buffer.slice(offset, offset + chunkLength))
      offset += chunkLength
    }
    buffers = []
  }, 1)

  return () => {
    clearInterval(intervalId)
  }
}

const pipe = (a: NodeJS.ReadWriteStream, b: NodeJS.ReadWriteStream): () => void => {
  const cleanA = pipeWithRandomizedChunks(a, b)
  const cleanB = pipeWithRandomizedChunks(b, a)
  return () => {
    cleanA()
    cleanB()
  }
}

describe('Framer', () => {
  it('varints', () => {
    const values = [0, 1, 5, 127, 128, 255, 256, 257, 1024, 1024 * 1024]
    for (const value of values) {
      const encoded = varint.encode(value, Buffer.allocUnsafe(4)).slice(0, varint.encode.bytes)
      const length = varint.encode.bytes
      expect(encoded.length).to.eq(length)

      const decoded = varint.decode(encoded)
      expect(decoded).to.equal(value)
      expect(varint.decode.bytes).to.equal(length)
    }
  })
  
  it('frame encoding', () => {
    const sizes = [0, 1, 5, 127, 128, 255, 256, 257, 1024, 1024 * 1024]
    for(const size of sizes) {
      const tag = varint.encode(size, Buffer.allocUnsafe(4)).slice(0, varint.encode.bytes)
      const payload = randomBytes(size)
      const frame = Buffer.concat([tag, payload])
      const decoded = readFrame(frame, 0)
      expect(decoded?.bytesConsumed).to.equal(frame.length)
      expect(decoded?.payload).to.deep.equal(payload)
    }
  })

  it('works', async () => {
    const peer1 = new Framer()
    const peer2 = new Framer()

    const clean = pipe(peer1.stream, peer2.stream)
    afterTest(clean)

    // Peer 1 loops messages back to peer 2.
    peer1.port.subscribe(message => {
      // console.log('lo', message.length)
      peer1.port.send(message)
    })

    const framesSent: Buffer[] = []
    const framesReceived: Buffer[] = []
    let subscribed = false

  
    // console.log('Start sending frames\n=================\n')

    const TOTAL_FRAMES = 1000
    while (framesSent.length < TOTAL_FRAMES) {
      const frame = randomBytes(Math.floor(Math.random() * 400))
      // console.log('wrt', frame.length)
      peer2.port.send(frame)
      framesSent.push(frame)

      if(Math.random() < 0.1) { // 10% chance to pause and check the messages.
        await sleep(2)

        if(!subscribed) { // Simulate subscription delay
          subscribed = true
          // console.log("subscribing")
          peer2.port.subscribe(message => {
    
            // console.log('rcv', message.length)
            framesReceived.push(Buffer.from(message))
          })
        }

        await sleep(2) // Must be longer the pipe's flush interval
        expect(framesReceived.length).to.deep.eq(framesSent.length)
        for(const i in framesSent) {
          expect(framesReceived[i]).to.deep.eq(framesSent[i], `Frame ${i} does not match`)
        }
        // console.log('Synced\n=================\n')
      }
    }
  })

  it('bench', async () => {
    const peer1 = new Framer()
    const peer2 = new Framer()

    pipeline(peer1.stream, peer2.stream, peer1.stream, () => {})

    // Peer 1 loops messages back to peer 2.
    peer1.port.subscribe(message => {
      peer1.port.send(message)
    })

    const framesSent: Buffer[] = []
    const framesReceived: Buffer[] = []
    peer2.port.subscribe(message => {
      framesReceived.push(Buffer.from(message))
    })

  
    const TOTAL_FRAMES = 1000
    while (framesSent.length < TOTAL_FRAMES) {
      const frame = randomBytes(Math.floor(Math.random() * 400))
      peer2.port.send(frame)
      framesSent.push(frame)
    }

    await waitForExpect(() => {
      expect(framesReceived.length).to.deep.eq(framesSent.length)
      for(const i in framesSent) {
        expect(framesReceived[i]).to.deep.eq(framesSent[i], `Frame ${i} does not match`)
      }
    })
  })
})