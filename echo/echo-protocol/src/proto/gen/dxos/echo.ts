import { codec, Message } from "@dxos/credentials";
import { PublicKey } from "@dxos/crypto";
import { Timeframe } from "../../../spacetime";
import * as dxos from "../dxos";
import * as dxos_echo_testing from "./echo/testing";
import * as dxos_echo_snapshot from "./echo/snapshot";
import * as dxos_echo_remote from "./echo/remote";
import * as google_protobuf from "../google/protobuf";
export interface TimeframeVector {
    frames?: TimeframeVector.Frame[];
}
export namespace TimeframeVector {
    export interface Frame {
        feedKey?: Uint8Array;
        seq?: number;
    }
}
export interface EchoEnvelope {
    itemId?: string;
    timeframe?: Timeframe;
    genesis?: ItemGenesis;
    itemMutation?: ItemMutation;
    mutation?: Uint8Array;
}
export interface ItemGenesis {
    itemType?: string;
    modelType?: string;
    modelVersion?: string;
    link?: LinkData;
}
export interface LinkData {
    source?: string;
    target?: string;
}
export interface ItemMutation {
    parentId?: string;
}
