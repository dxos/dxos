import { codec, Message } from "@dxos/credentials";
import { PublicKey } from "@dxos/crypto";
import { Timeframe } from "../../../spacetime";
import * as dxos from "../dxos";
import * as dxos_echo from "../dxos/echo";
import * as dxos_echo_testing from "../dxos/echo/testing";
import * as dxos_echo_snapshot from "../dxos/echo/snapshot";
import * as dxos_echo_remote from "../dxos/echo/remote";
export interface Any {
    type_url?: string;
    value?: Uint8Array;
}
