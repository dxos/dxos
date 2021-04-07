import { codec, Message } from "@dxos/credentials";
import { PublicKey } from "@dxos/crypto";
import { Timeframe } from "../../spacetime";
import * as dxos_echo_testing from "./dxos/echo/testing";
import * as dxos_echo from "./dxos/echo";
import * as dxos_echo_snapshot from "./dxos/echo/snapshot";
import * as google_protobuf from "./google/protobuf";
export interface FeedMessage {
    halo?: Message;
    echo?: dxos_echo.EchoEnvelope;
}
export interface CredentialsMessage {
    data?: Uint8Array;
}
