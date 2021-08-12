//
// Copyright 2020 DXOS.org
//

export interface Stream<T> {
  send(msg: T): void;
  close(msg?: any): void;
  onMessage(callback: (data: T) => void): (() => void);
  onClose(callback: () => void): (() => void);
}

export interface DevtoolsBridge {
  send (message: string, payload: any): Promise<any>;

  openStream (channel: string): Promise<Stream<any>>;

  listen (message: string, fn: (data: any) => void): void;

  on(event: 'api', cb: (ready: boolean) => void): void;

  getConfig(): Promise<any>;
}
