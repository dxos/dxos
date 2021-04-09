import { Schema } from "@dxos/codec-protobuf";
import * as dxos_echo_object from "./dxos/echo/object";
export interface TYPES {
    "dxos.echo.object.Value": dxos_echo_object.Value;
    "dxos.echo.object.KeyValue": dxos_echo_object.KeyValue;
    "dxos.echo.object.Object": dxos_echo_object.Object;
    "dxos.echo.object.ObjectMutation": dxos_echo_object.ObjectMutation;
    "dxos.echo.object.ObjectMutation.Operation": dxos_echo_object.ObjectMutation.Operation;
    "dxos.echo.object.ObjectMutationSet": dxos_echo_object.ObjectMutationSet;
    "dxos.echo.object.ObjectSnapshot": dxos_echo_object.ObjectSnapshot;
}
export const schemaJson = JSON.parse("{\"nested\":{\"dxos\":{\"nested\":{\"echo\":{\"nested\":{\"object\":{\"nested\":{\"Value\":{\"oneofs\":{\"Type\":{\"oneof\":[\"null\",\"bool\",\"int\",\"float\",\"string\",\"timestamp\",\"datetime\",\"bytes\",\"object\"]}},\"fields\":{\"null\":{\"type\":\"bool\",\"id\":1},\"bool\":{\"type\":\"bool\",\"id\":2},\"int\":{\"type\":\"int32\",\"id\":3},\"float\":{\"type\":\"float\",\"id\":4},\"string\":{\"type\":\"string\",\"id\":5},\"timestamp\":{\"type\":\"string\",\"id\":10},\"datetime\":{\"type\":\"string\",\"id\":11},\"bytes\":{\"type\":\"bytes\",\"id\":12},\"object\":{\"type\":\"Object\",\"id\":20}}},\"KeyValue\":{\"fields\":{\"key\":{\"type\":\"string\",\"id\":1},\"value\":{\"type\":\"Value\",\"id\":2}}},\"Object\":{\"fields\":{\"properties\":{\"rule\":\"repeated\",\"type\":\"KeyValue\",\"id\":1}}},\"ObjectMutation\":{\"fields\":{\"operation\":{\"type\":\"Operation\",\"id\":1},\"key\":{\"type\":\"string\",\"id\":2},\"value\":{\"type\":\"Value\",\"id\":3}},\"nested\":{\"Operation\":{\"values\":{\"SET\":0,\"DELETE\":1,\"ARRAY_PUSH\":2,\"SET_ADD\":3,\"SET_DELETE\":4}}}},\"ObjectMutationSet\":{\"fields\":{\"mutations\":{\"rule\":\"repeated\",\"type\":\"ObjectMutation\",\"id\":1}}},\"ObjectSnapshot\":{\"fields\":{\"root\":{\"type\":\"Value\",\"id\":1}}}}}}}}}}}");
export const schema = Schema.fromJson<TYPES>(schemaJson);
