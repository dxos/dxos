import { Schema as CodecSchema } from "@dxos/codec-protobuf";
import { PublicKey } from "@dxos/crypto";
import { SecretKey } from "../../../keys";
import { DecodedAny } from "../../any";
import * as dxos_credentials_identity from "./credentials/identity";
import * as dxos_credentials_greet from "./credentials/greet";
import * as dxos_credentials_keys from "./credentials/keys";
import * as dxos_credentials_auth from "./credentials/auth";
import * as dxos_credentials_party from "./credentials/party";
import * as google_protobuf from "../google/protobuf";
export interface Message {
    payload: any;
}
export interface SignedMessage {
    signed: SignedMessage.Signed;
    signatures?: SignedMessage.Signature[];
}
export namespace SignedMessage {
    export interface Signed {
        created: string;
        nonce: Uint8Array;
        payload: any;
    }
    export interface Signature {
        key: PublicKey;
        signature: Uint8Array;
        keyChain?: dxos_credentials_keys.KeyChain;
    }
}
