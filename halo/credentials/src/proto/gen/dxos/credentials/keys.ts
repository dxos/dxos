import { Schema as CodecSchema } from "@dxos/codec-protobuf";
import { PublicKey } from "@dxos/crypto";
import { SecretKey } from "../../../../keys";
import { DecodedAny } from "../../../any";
import * as dxos_credentials from "../credentials";
import * as dxos_credentials_auth from "./auth";
import * as dxos_credentials_greet from "./greet";
import * as dxos_credentials_identity from "./identity";
import * as dxos_credentials_party from "./party";
import * as google_protobuf from "../../google/protobuf";
export enum KeyType {
    UNKNOWN = 0,
    IDENTITY = 1,
    DEVICE = 2,
    PARTY = 3,
    FEED = 4
}
export interface PubKey {
    data?: Uint8Array;
}
export interface PrivKey {
    data?: Uint8Array;
}
export interface KeyRecord {
    type: KeyType;
    publicKey: PublicKey;
    secretKey?: Buffer;
    hint?: boolean;
    own?: boolean;
    trusted?: boolean;
    added?: string;
    created?: string;
}
export interface KeyRecordList {
    keys?: KeyRecord[];
}
export interface KeyChain {
    publicKey: PublicKey;
    message: dxos_credentials.SignedMessage;
    parents?: KeyChain[];
}
