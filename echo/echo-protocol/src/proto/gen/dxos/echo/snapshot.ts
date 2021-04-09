import { codec, Message } from "@dxos/credentials";
import { PublicKey } from "@dxos/crypto";
import { Timeframe } from "../../../../spacetime";
import * as dxos from "../../dxos";
import * as dxos_echo from "../echo";
import * as dxos_echo_remote from "./remote";
import * as dxos_echo_testing from "./testing";
import * as google_protobuf from "../../google/protobuf";
export interface PartySnapshot {
    partyKey?: Uint8Array;
    timeframe?: Timeframe;
    timestamp?: number;
    halo?: HaloStateSnapshot;
    database?: DatabaseSnapshot;
}
export interface DatabaseSnapshot {
    items?: ItemSnapshot[];
}
export interface HaloStateSnapshot {
    messages?: Message[];
}
export interface ItemSnapshot {
    itemId?: string;
    itemType?: string;
    modelType?: string;
    modelVersion?: string;
    parentId?: string;
    model?: ModelSnapshot;
}
export interface ModelSnapshot {
    custom?: Uint8Array;
    array?: ModelMutationArray;
}
export interface ModelMutationArray {
    mutations?: ModelMutation[];
}
export interface ModelMutation {
    mutation: Uint8Array;
    meta: ModelMutationMeta;
}
export interface ModelMutationMeta {
    feedKey: Uint8Array;
    seq: number;
    memberKey: Uint8Array;
}
