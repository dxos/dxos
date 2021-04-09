import { codec, Message } from "@dxos/credentials";
import { PublicKey } from "@dxos/crypto";
import { Timeframe } from "../../../../spacetime";
import * as dxos from "../../dxos";
import * as dxos_echo from "../echo";
import * as dxos_echo_remote from "./remote";
import * as dxos_echo_snapshot from "./snapshot";
import * as google_protobuf from "../../google/protobuf";
export interface TestItemMutation {
    key?: string;
    value?: string;
}
