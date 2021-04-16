import { Schema } from "@dxos/codec-protobuf";
import * as dxos_protocol_presence from "./dxos/protocol/presence";
export interface TYPES {
    "dxos.protocol.presence.Alive": dxos_protocol_presence.Alive;
    "dxos.protocol.presence.Alive.Connection": dxos_protocol_presence.Alive.Connection;
}
export const schemaJson = JSON.parse("{\"nested\":{\"dxos\":{\"nested\":{\"protocol\":{\"nested\":{\"presence\":{\"nested\":{\"Alive\":{\"fields\":{\"peerId\":{\"type\":\"bytes\",\"id\":1},\"connections\":{\"rule\":\"repeated\",\"type\":\"Connection\",\"id\":2},\"metadata\":{\"type\":\"bytes\",\"id\":3}},\"nested\":{\"Connection\":{\"fields\":{\"peerId\":{\"type\":\"bytes\",\"id\":1},\"initiator\":{\"type\":\"bool\",\"id\":2}}}}}}}}}}}}}");
export const schema = Schema.fromJson<TYPES>(schemaJson);
