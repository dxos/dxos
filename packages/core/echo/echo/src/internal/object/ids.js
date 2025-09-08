"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQueueDXN = void 0;
var keys_1 = require("@dxos/keys");
// TODO(burdon): Move to @dxos/keys once ObjectId is moved there.
/**
 * @deprecated Use `db.queues.create()`
 */
var createQueueDXN = function (spaceId, queueId) {
    if (spaceId === void 0) { spaceId = keys_1.SpaceId.random(); }
    if (queueId === void 0) { queueId = keys_1.ObjectId.random(); }
    return new keys_1.DXN(keys_1.DXN.kind.QUEUE, [keys_1.QueueSubspaceTags.DATA, spaceId, queueId]);
};
exports.createQueueDXN = createQueueDXN;
