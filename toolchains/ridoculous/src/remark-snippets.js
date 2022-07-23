"use strict";
//
// Copyright 2022 DXOS.org
//
exports.__esModule = true;
exports.remarkSnippets = void 0;
var tsdoc_1 = require("@microsoft/tsdoc");
var debug_1 = require("debug");
var fs = require("fs");
var path = require("path");
var process = require("process");
var protobuf = require("protocol-buffers-schema");
var unist_util_visit_1 = require("unist-util-visit");
console.log(':::', protobuf);
var log = (0, debug_1["default"])('dxos:ridoculous:error');
var langType = {
    '.sh': {
        lang: 'bash'
    },
    '.js': {
        lang: 'javascript'
    },
    '.json': {
        lang: 'json'
    },
    // TODO(burdon): Extract definitions.
    //  https://tsdoc.org
    //  https://www.npmjs.com/package/@microsoft/tsdoc
    //  https://github.com/microsoft/tsdoc
    //  https://github.com/microsoft/tsdoc/blob/main/api-demo/src/simpleDemo.ts
    '.ts': {
        lang: 'ts',
        parser: function (content, _a) {
            var def = _a.hash;
            var parser = new tsdoc_1.TSDocParser();
            parser.parseString(content);
            return content;
        }
    },
    '.proto': {
        lang: 'protobuf',
        parser: function (content, _a) {
            var message = _a.hash;
            // Filter given message.
            if (message) {
                // https://www.npmjs.com/package/protocol-buffers-schema
                var schema = protobuf.parse(content);
                schema.messages = schema.messages.filter(function (_a) {
                    var name = _a.name;
                    return name === message;
                });
                schema.imports = [];
                schema.package = '';
                // TODO(burdon): Preserve comments.
                var output = protobuf.stringify(schema);
                output = output.replace(/syntax.*/, ''); // Syntax declaration.
                output = output.replace(/^\s*\n/gm, ''); // Blank lines.
                return output;
            }
            return content;
        }
    },
    '.yml': {
        lang: 'yaml'
    }
};
/**
 * Import snippets.
 * See https://www.gatsbyjs.com/plugins/gatsby-remark-embed-snippet/?=snippet
 */
// TODO(burdon): Create test.
var remarkSnippets = function (_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.baseDir, baseDir = _c === void 0 ? process.cwd() : _c;
    return function (tree) {
        (0, unist_util_visit_1.visit)(tree, 'code', function (node) {
            var _a;
            var match = node.value.trim().match(/@import (.+)/);
            if (match) {
                var _b = match[1].split('#'), file = _b[0], hash = _b[1];
                try {
                    var content = fs.readFileSync(path.join(baseDir, file), 'utf8');
                    // Type.
                    var ext = path.parse(file).ext;
                    var _c = langType[ext], lang = _c.lang, parser = _c.parser;
                    if (lang) {
                        node.lang = lang;
                        node.value = (_a = parser === null || parser === void 0 ? void 0 : parser(content, { hash: hash })) !== null && _a !== void 0 ? _a : content;
                    }
                }
                catch (err) {
                    log(String(err));
                }
            }
        });
    };
};
exports.remarkSnippets = remarkSnippets;
