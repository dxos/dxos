import { DXOSError } from "./dxos-error";

export class InvalidParameterError extends DXOSError {
  constructor(message?: string) {
    super('INVALID_PARAMETER', message);
  }
}
