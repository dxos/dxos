import { Stream } from "@dxos/codec-protobuf";
import { raise } from "@dxos/debug";
import { DataService, MutationReceipt, PartyKey, SubscribeEntitySetRequest, SubscribeEntitySetResponse, SubscribeEntityStreamRequest, SubscribeEntityStreamResponse, WriteRequest } from "@dxos/echo-protocol";
import { ComplexMap } from "@dxos/util";
import assert from "assert";
import { PartyNotFoundError } from "..";
import { DataServiceHost } from "./data-service-host";

export class DataServiceRouter implements DataService {
    private readonly _trackedParties = new ComplexMap<PartyKey, DataServiceHost>(x => x.toHex())

    trackParty(key: PartyKey, host: DataServiceHost) {
        this._trackedParties.set(key, host);
    }

    SubscribeEntitySet(request: SubscribeEntitySetRequest): Stream<SubscribeEntitySetResponse> {
        assert(request.partyKey)
        const host = this._trackedParties.get(request.partyKey) ?? raise(new PartyNotFoundError(request.partyKey));
        return host.subscribeEntitySet();
    }

    SubscribeEntityStream(request: SubscribeEntityStreamRequest): Stream<SubscribeEntityStreamResponse> {
        assert(request.partyKey)
        const host = this._trackedParties.get(request.partyKey) ?? raise(new PartyNotFoundError(request.partyKey));
        return host.subscribeEntityStream(request);

    }

    Write(request: WriteRequest): Promise<MutationReceipt> {
        assert(request.partyKey);
        assert(request.mutation);
        const host = this._trackedParties.get(request.partyKey) ?? raise(new PartyNotFoundError(request.partyKey));
        return host.write(request.mutation);
    }

}