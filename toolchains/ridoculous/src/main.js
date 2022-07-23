"use strict";
//
// Copyright 2022 DXOS.org
//
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var debug_1 = require("debug");
var fs = require("fs");
var glob_1 = require("glob");
var path = require("path");
var process = require("process");
var to_vfile_1 = require("to-vfile");
var parser_js_1 = require("./parser.js");
var log = (0, debug_1["default"])('dxos:ridoculous:main');
var main = function (_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.baseDir, baseDir = _c === void 0 ? process.cwd() : _c, _d = _b.files, files = _d === void 0 ? 'docs/**/*.md' : _d, _e = _b.html, html = _e === void 0 ? false : _e, toc = _b.toc, _f = _b.outDir, outDir = _f === void 0 ? './out' : _f;
    return __awaiter(void 0, void 0, void 0, function () {
        var parser, globFiles, _i, globFiles_1, filename, text, _g, _h, parts, f, outFilename, dirname;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    parser = (0, parser_js_1.createParser)({ baseDir: baseDir, html: html, toc: toc });
                    globFiles = glob_1.glob.sync(files);
                    _i = 0, globFiles_1 = globFiles;
                    _j.label = 1;
                case 1:
                    if (!(_i < globFiles_1.length)) return [3 /*break*/, 5];
                    filename = globFiles_1[_i];
                    log("Parsing: ".concat(filename));
                    _h = (_g = parser).process;
                    return [4 /*yield*/, (0, to_vfile_1.read)(filename)];
                case 2: return [4 /*yield*/, _h.apply(_g, [_j.sent()])];
                case 3:
                    text = _j.sent();
                    parts = path.parse(filename);
                    f = path.format(__assign(__assign({}, parts), { base: undefined, ext: '.html' }));
                    outFilename = path.join(outDir, path.relative(baseDir, f));
                    dirname = path.dirname(outFilename);
                    if (!fs.existsSync(dirname)) {
                        fs.mkdirSync(dirname, { recursive: true });
                    }
                    fs.writeFileSync(outFilename, text.toString() + '\n', 'utf8');
                    log("Wrote: ".concat(outFilename));
                    _j.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    });
};
// TODO(burdon): Yargs.
void main({
    baseDir: 'testing',
    files: 'testing/**/*.md',
    html: true,
    toc: '.*contents.*'
});
