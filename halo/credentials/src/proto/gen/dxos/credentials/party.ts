import { Schema as CodecSchema } from "@dxos/codec-protobuf";
import { PublicKey } from "@dxos/crypto";
import { SecretKey } from "../../../../keys";
import { DecodedAny } from "../../../any";
import * as dxos_credentials_auth from "./auth";
import * as dxos_credentials_greet from "./greet";
import * as dxos_credentials_identity from "./identity";
import * as dxos_credentials_keys from "./keys";
import * as dxos_credentials from "../credentials";
import * as google_protobuf from "../../google/protobuf";
export interface PartyCredential {
    type?: PartyCredential.Type;
    envelope?: Envelope;
    partyGenesis?: PartyGenesis;
    keyAdmit?: KeyAdmit;
    feedAdmit?: FeedAdmit;
    feedGenesis?: FeedGenesis;
}
export namespace PartyCredential {
    export enum Type {
        ENVELOPE = 0,
        PARTY_GENESIS = 1,
        FEED_GENESIS = 2,
        KEY_ADMIT = 3,
        FEED_ADMIT = 4
    }
}
export interface PartyGenesis {
    partyKey?: PublicKey;
    feedKey?: PublicKey;
    admitKey?: PublicKey;
    admitKeyType?: dxos_credentials_keys.KeyType;
}
export interface KeyAdmit {
    partyKey?: PublicKey;
    admitKey?: PublicKey;
    admitKeyType?: dxos_credentials_keys.KeyType;
}
export interface FeedAdmit {
    partyKey?: PublicKey;
    feedKey?: PublicKey;
}
export interface FeedGenesis {
    feedKey?: PublicKey;
    ownerKey?: PublicKey;
}
export interface Envelope {
    partyKey?: PublicKey;
    message?: dxos_credentials.Message;
}
export interface PartyInvitation {
    id?: Uint8Array;
    partyKey?: PublicKey;
    issuerKey?: PublicKey;
    inviteeKey?: PublicKey;
}
