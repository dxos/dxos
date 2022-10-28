import { RpcPort } from "./rpc-port"

export type CreateStreamOpts = {
  contentType?: string
}

export class Channel {
  createStream(tag: string, opts: CreateStreamOpts): NodeJS.ReadWriteStream {

  }

  createPort(tag: string, opts: CreateStreamOpts): RpcPort {

  }
}