import { Schema } from "@dxos/codec-protobuf";
import * as dxos_protocol from "./dxos/protocol";
import * as google_protobuf from "./google/protobuf";
export interface TYPES {
    "dxos.protocol.Buffer": dxos_protocol.Buffer;
    "dxos.protocol.Error": dxos_protocol.Error;
    "dxos.protocol.Message": dxos_protocol.Message;
    "google.protobuf.Any": google_protobuf.Any;
}
export const schemaJson = JSON.parse("{\"nested\":{\"dxos\":{\"nested\":{\"protocol\":{\"nested\":{\"Buffer\":{\"fields\":{\"data\":{\"type\":\"bytes\",\"id\":1}}},\"Error\":{\"fields\":{\"code\":{\"type\":\"string\",\"id\":1},\"message\":{\"type\":\"string\",\"id\":2}}},\"Message\":{\"fields\":{\"nmId\":{\"type\":\"string\",\"id\":1},\"nmResponse\":{\"type\":\"bool\",\"id\":2},\"nmEphemeral\":{\"type\":\"bool\",\"id\":3},\"nmData\":{\"type\":\"google.protobuf.Any\",\"id\":4}}}}}}},\"google\":{\"nested\":{\"protobuf\":{\"nested\":{\"Any\":{\"fields\":{\"type_url\":{\"type\":\"string\",\"id\":1},\"value\":{\"type\":\"bytes\",\"id\":2}}}}}}}}}");
export const schema = Schema.fromJson<TYPES>(schemaJson);
