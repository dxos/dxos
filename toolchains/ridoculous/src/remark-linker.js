"use strict";
//
// Copyright 2022 DXOS.org
//
exports.__esModule = true;
exports.remarkLinker = void 0;
var unist_util_visit_1 = require("unist-util-visit");
// TODO(burdon): Fine line number in Github?
// https://github.com/dxos/protocols/blob/main/packages/common/protocols/src/proto/dxos/client.proto#L28
/**
 * Validate links.
 */
// TODO(burdon): Create test.
var remarkLinker = function (_a) {
    var baseDir = _a.baseDir;
    return function (tree) {
        (0, unist_util_visit_1.visit)(tree, 'link', function (node) {
            var url = node.url;
            (0, unist_util_visit_1.visit)(node, 'text', function (_a) {
                var value = _a.value;
                // TODO(burdon): Validate link
                // console.log(value, url);
            });
            (0, unist_util_visit_1.visit)(node, 'inlineCode', function (_a) {
                var value = _a.value;
                // TODO(burdon): Validate name (proto, class).
                // console.log(value, url);
            });
        });
    };
};
exports.remarkLinker = remarkLinker;
