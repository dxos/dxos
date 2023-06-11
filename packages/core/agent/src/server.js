"use strict";
//
// Copyright 2023 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
// TODO(burdon): Express ECHO http server (with Client to daemon/agent).
// TODO(burdon): Factor out daemon from CLI.
// TODO(burdon): GET Query/POST upsert.
var server = function () {
    var app = (0, express_1.default)();
    app.listen(3000, function () {
        console.log('running...');
    });
};
server();
