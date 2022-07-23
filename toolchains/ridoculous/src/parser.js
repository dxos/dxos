"use strict";
//
// Copyright 2022 DXOS.org
//
exports.__esModule = true;
exports.createParser = void 0;
var rehype_stringify_1 = require("rehype-stringify");
var remark_1 = require("remark");
var remark_gfm_1 = require("remark-gfm");
var remark_lint_1 = require("remark-lint");
var remark_normalize_headings_1 = require("remark-normalize-headings");
var remark_rehype_1 = require("remark-rehype");
var remark_toc_1 = require("remark-toc");
var remark_heading_js_1 = require("./remark-heading.js");
var remark_linker_js_1 = require("./remark-linker.js");
var remark_snippets_js_1 = require("./remark-snippets.js");
/**
 * Generate parser.
 */
var createParser = function (_a) {
    var baseDir = _a.baseDir, toc = _a.toc, html = _a.html;
    // https://github.com/remarkjs/awesome-remark
    var unified = (0, remark_1.remark)()
        .use(remark_gfm_1["default"])
        .use(remark_lint_1["default"])
        .use(remark_normalize_headings_1["default"])
        // TODO(burdon): Why TS errors?
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .use(remark_snippets_js_1.remarkSnippets, { baseDir: baseDir })
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .use(remark_linker_js_1.remarkLinker, { baseDir: baseDir })
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .use(remark_heading_js_1.remarkHeading, { toc: toc });
    if (toc) {
        unified
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .use(remark_toc_1["default"], { heading: toc });
    }
    if (html) {
        unified
            .use(remark_rehype_1["default"])
            .use(rehype_stringify_1["default"]);
    }
    return unified;
};
exports.createParser = createParser;
