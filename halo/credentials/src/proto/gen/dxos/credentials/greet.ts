import { Schema as CodecSchema } from "@dxos/codec-protobuf";
import { PublicKey } from "@dxos/crypto";
import { SecretKey } from "../../../../keys";
import { DecodedAny } from "../../../any";
import * as dxos_credentials_auth from "./auth";
import * as dxos_credentials_identity from "./identity";
import * as dxos_credentials_keys from "./keys";
import * as dxos_credentials_party from "./party";
import * as dxos_credentials from "../credentials";
import * as google_protobuf from "../../google/protobuf";
export interface Command {
    command?: Command.Type;
    secret?: Uint8Array;
    params?: any[];
}
export namespace Command {
    export enum Type {
        BEGIN = 0,
        HANDSHAKE = 1,
        NOTARIZE = 2,
        FINISH = 3,
        CLAIM = 10
    }
}
export interface BeginResponse {
    info?: Partial<Record<string, any>>;
}
export interface HandshakeResponse {
    nonce?: Uint8Array;
    partyKey?: PublicKey;
}
export interface NotarizeResponse {
    copies?: any[];
    hints?: KeyHint[];
}
export interface KeyHint {
    publicKey?: PublicKey;
    type?: dxos_credentials_keys.KeyType;
}
export interface ClaimResponse {
    id?: Uint8Array;
    rendezvousKey?: Uint8Array;
}
