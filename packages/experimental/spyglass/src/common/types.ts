//
// Copyright 2022 DXOS.org
//

export enum Command {
  CLEAR,
  LOG
}

export type Message = {
  key: string
  data: any
}

export type Log = {
  messages: Message[]
}

export type Post = {
  cmd: Command
  data?: any
}
