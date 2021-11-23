import { Stream } from "@dxos/codec-protobuf";
import { DataService, EchoEnvelope, FeedWriter, MutationReceipt, SubscribeEntitySetRequest, SubscribeEntitySetResponse, SubscribeEntityStreamRequest, SubscribeEntityStreamResponse } from "@dxos/echo-protocol";
import assert from "assert";
import { ItemManager } from ".";

export class DataServiceHost implements DataService {
    constructor(
        private readonly _itemManager: ItemManager,
        private readonly _writeStream?: FeedWriter<EchoEnvelope>
    ) {}

    SubscribeEntitySet(request: SubscribeEntitySetRequest): Stream<SubscribeEntitySetResponse> {
        return new Stream(({ next }) => {
            function update() {

            }
            
            return this._itemManager.debouncedItemUpdate.on(update)
        })
    }

    SubscribeEntityStream(request: SubscribeEntityStreamRequest): Stream<SubscribeEntityStreamResponse> {

    }

    async Write(request: EchoEnvelope): Promise<MutationReceipt> {
        assert(this._writeStream, 'Cannot write mutations in readonly mode');

        return this._writeStream.write(request);
    }
}