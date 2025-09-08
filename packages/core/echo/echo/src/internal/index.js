"use strict";
//
// Copyright 2024 DXOS.org
//
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForeignKey = exports.ObjectId = exports.JsonProp = exports.splitJsonPath = exports.JsonPath = void 0;
var effect_1 = require("@dxos/effect");
Object.defineProperty(exports, "JsonPath", { enumerable: true, get: function () { return effect_1.JsonPath; } });
Object.defineProperty(exports, "splitJsonPath", { enumerable: true, get: function () { return effect_1.splitJsonPath; } });
Object.defineProperty(exports, "JsonProp", { enumerable: true, get: function () { return effect_1.JsonProp; } });
// TODO(dmaretskyi): Remove.
var keys_1 = require("@dxos/keys");
Object.defineProperty(exports, "ObjectId", { enumerable: true, get: function () { return keys_1.ObjectId; } });
var echo_protocol_1 = require("@dxos/echo-protocol");
Object.defineProperty(exports, "ForeignKey", { enumerable: true, get: function () { return echo_protocol_1.ForeignKey; } });
__exportStar(require("./ast"), exports);
__exportStar(require("./formats"), exports);
__exportStar(require("./json"), exports);
__exportStar(require("./json-schema"), exports);
__exportStar(require("./object"), exports);
__exportStar(require("./query"), exports);
__exportStar(require("./types"), exports);
__exportStar(require("../../../live-object/src/define-hidden-property"), exports);
__exportStar(require("./ref"), exports);
__exportStar(require("./projection"), exports);
__exportStar(require("./schema"), exports);
