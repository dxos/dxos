import { Schema } from "@dxos/codec-protobuf";
import * as dxos_echo_text from "./dxos/echo/text";
export interface TYPES {
    "dxos.echo.text.Mutation": dxos_echo_text.Mutation;
    "dxos.echo.text.Snapshot": dxos_echo_text.Snapshot;
}
export const schemaJson = JSON.parse("{\"nested\":{\"dxos\":{\"nested\":{\"echo\":{\"nested\":{\"text\":{\"nested\":{\"Mutation\":{\"fields\":{\"update\":{\"type\":\"bytes\",\"id\":1},\"clientId\":{\"type\":\"int32\",\"id\":2}}},\"Snapshot\":{\"fields\":{\"data\":{\"type\":\"bytes\",\"id\":1}}}}}}}}}}}");
export const schema = Schema.fromJson<TYPES>(schemaJson);
