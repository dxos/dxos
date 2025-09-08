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
__exportStar(require("./common"), exports);
__exportStar(require("./create"), exports);
__exportStar(require("./entity"), exports);
__exportStar(require("./expando"), exports);
__exportStar(require("./ids"), exports);
__exportStar(require("./json-serializer"), exports);
__exportStar(require("./meta"), exports);
__exportStar(require("./typed-object"), exports);
__exportStar(require("./typed-relation"), exports);
__exportStar(require("./typename"), exports);
__exportStar(require("./deleted"), exports);
__exportStar(require("./model"), exports);
__exportStar(require("./accessors"), exports);
__exportStar(require("./schema-validator"), exports);
