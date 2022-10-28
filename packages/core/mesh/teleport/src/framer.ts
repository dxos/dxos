import { Duplex } from "stream"
import { RpcPort } from "./rpc-port"
import * as varint from "varint"
import assert from "assert"

/**
 * Framer that turns a stream of binary messages into a framed RpcPort.
 * 
 * Buffers are 
 */
export class Framer {
  // private readonly _tagBuffer = Buffer.alloc(4)
  private _messageCb?: (msg: Uint8Array) => void
  // private _writeCb?: () => void
  private _buffer?: Buffer // The rest of the bytes from the previous write call.

  private readonly _stream = new Duplex({
    objectMode: false,
    read: () => {},
    write: (chunk, encoding, callback) => {
      // assert(!this._writeCb, 'Internal Framer bug. Concurrent writes detected.')
      assert(this._messageCb, 'TODO: Message CB buffering')

      if(this._buffer && this._buffer.length > 0) {
        this._buffer = Buffer.concat([this._buffer, chunk])
      } else {
        this._buffer = chunk
      }

      let offset = 0;
      while (offset < this._buffer!.length) {
        const frame = readFrame(this._buffer!, offset)
        // console.log(`pop chunk=${this._buffer!.length} offset=${offset} consumed=${frame?.bytesConsumed} length=${frame?.payload.length}`)

        if(!frame) {
          break; // Couldn't read frame but there are still bytes left in the buffer.
        }
        offset += frame.bytesConsumed
        this._messageCb!(frame.payload)
      }

      if(offset < this._buffer!.length) { // Save the rest of the bytes for the next write call.
        this._buffer = this._buffer!.slice(offset)
      } else {
        this._buffer = undefined
      }
      // console.log('keep', this._buffer?.length ?? 0)

      callback()
    }
  })
  
  public readonly port: RpcPort = {
    send: (message) => {
      this._stream.push(encodeLength(message.length))
      this._stream.push(message)
    },
    subscribe: (callback) => {
      assert(!this._messageCb, 'Rpc port already has a message listener.');
      console.log('SUbbed')
      this._messageCb = callback
      // this._writeCb?.()
      return () => {
        this._messageCb = undefined
      }
    }
  }

  get stream (): NodeJS.ReadWriteStream {
    return this._stream
  }
}

/**
 * Attempts to read a frame from the input buffer. 
 */
export const readFrame = (buffer: Buffer, offset: number): { payload: Buffer, bytesConsumed: number } | undefined => {
  try {
    const frameLength = varint.decode(buffer, offset)
    const tagLength = varint.decode.bytes

    if(buffer.length < offset + tagLength + frameLength) { // Not enough bytes to read the frame.
      return undefined
    }

    const payload = buffer.slice(offset + tagLength, offset + tagLength + frameLength)

    return {
      payload,
      bytesConsumed: tagLength + frameLength
    }
  } catch (err) {
    if(err instanceof RangeError) { // Not enough bytes to read the tag.
      return undefined
    }  else {
      throw err
    }
  }
}

const encodeLength = (length: number) => {
  const res = varint.encode(length, Buffer.allocUnsafe(4)).slice(0, varint.encode.bytes)
  if(varint.encode.bytes > 4) {
    throw new Error('Frame too large')
  }
  return res
}