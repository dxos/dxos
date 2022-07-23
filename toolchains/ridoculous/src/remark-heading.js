"use strict";
//
// Copyright 2022 DXOS.org
//
exports.__esModule = true;
exports.remarkHeading = void 0;
var unist_util_visit_1 = require("unist-util-visit");
var formatNumber = function (n) { return n.join('.'); };
/**
 * Create heading numbers.
 */
// TODO(burdon): Create test.
var remarkHeading = function (_a) {
    var toc = _a.toc;
    return function (tree) {
        var tocReg = toc ? RegExp('^(' + toc + ')$', 'i') : undefined; // Matches remark-toc.
        var numbers = [0];
        (0, unist_util_visit_1.visit)(tree, 'heading', function (node) {
            var depth = node.depth - 2;
            if (depth >= 0) {
                (0, unist_util_visit_1.visit)(node, 'text', function (node) {
                    if (tocReg && node.value.match(tocReg)) {
                        return;
                    }
                    if (depth >= numbers.length) {
                        numbers.push(1);
                    }
                    else {
                        numbers[depth] = numbers[depth] + 1;
                        numbers.splice(depth + 1);
                    }
                    node.value = "".concat(formatNumber(numbers), ". ").concat(node.value);
                });
            }
        });
    };
};
exports.remarkHeading = remarkHeading;
