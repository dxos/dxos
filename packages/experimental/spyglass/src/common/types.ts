//
// Copyright 2022 DXOS.org
//

export enum Command {
  CLEAR,
  LOG,
  MARK
}

export type Message = {
  key: string
  data: any
}

export type Log = {
  label?: string
  messages: Message[]
}

export type Post = {
  cmd: Command
  data?: any
  label?: string
}
