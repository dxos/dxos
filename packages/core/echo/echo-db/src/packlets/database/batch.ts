import { EchoObjectBatch } from "@dxos/protocols/proto/dxos/echo/object";

export class Batch {
  public readonly data: EchoObjectBatch = { objects: [] };
  public clientTag?: string;

  constructor() {}
}