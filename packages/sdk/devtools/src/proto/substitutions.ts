import { PublicKey } from "@dxos/crypto";

export default {
  'dxos.credentials.keys.PubKey': {
    encode: (value: PublicKey) => ({ data: value.asUint8Array() }),
    decode: (value: any) => PublicKey.from(value.data)
  },
  'google.protobuf.Timestamp': {
    encode: (value: number) => ({ seconds: value / 1000 }),
    decode: (value: any) => +(value.seconds + '000')
  }
}
