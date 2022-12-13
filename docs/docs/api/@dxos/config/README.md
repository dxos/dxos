"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/sdk/config/src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  ConfigProto: () => import_config2.Config,
  Defaults: () => Defaults,
  Dynamics: () => Dynamics,
  Envs: () => Envs,
  FILE_DEFAULTS: () => FILE_DEFAULTS,
  FILE_DYNAMICS: () => FILE_DYNAMICS,
  FILE_ENVS: () => FILE_ENVS,
  LocalStorage: () => LocalStorage,
  defs: () => defs,
  mapFromKeyValues: () => mapFromKeyValues,
  mapToKeyValues: () => mapToKeyValues
});
module.exports = __toCommonJS(src_exports);
var defs = __toESM(require("@dxos/protocols/proto/dxos/config"));
var import_config2 = require("@dxos/protocols/proto/dxos/config");

// packages/sdk/config/src/config.ts
var import_boolean = require("boolean");
var import_lodash = __toESM(require("lodash.defaultsdeep"));
var import_lodash2 = __toESM(require("lodash.get"));
var import_lodash3 = __toESM(require("lodash.set"));

// packages/sdk/config/src/sanitizer.ts
var import_codec_protobuf = require("@dxos/codec-protobuf");
var import_errors = require("@dxos/errors");
var import_protocols = require("@dxos/protocols");
var configRootType = import_protocols.schema.getCodecForType("dxos.config.Config");
var sanitizeConfig = (config) => {
  if (!("version" in config)) {
    throw new import_errors.InvalidConfigError("Version not specified");
  }
  if ((config == null ? void 0 : config.version) !== 1) {
    throw new import_errors.InvalidConfigError(`Invalid config version: ${config.version}`);
  }
  const ctx = {
    errors: []
  };
  (0, import_codec_protobuf.sanitize)(configRootType.protoType, config, "", ctx);
  if (ctx.errors.length > 0) {
    throw new import_errors.InvalidConfigError(ctx.errors.join("\n"));
  }
  const error = configRootType.protoType.verify(config);
  if (error) {
    throw new import_errors.InvalidConfigError(error);
  }
  return config;
};

// packages/sdk/config/src/config.ts
var mapFromKeyValues = (spec, values) => {
  const config = {};
  for (const [key, { path: path2, type }] of Object.entries(spec)) {
    let value = values[key];
    if (value !== void 0) {
      if (type) {
        switch (type) {
          case "boolean": {
            value = (0, import_boolean.boolean)(value);
            break;
          }
          case "number": {
            value = Number(value);
            break;
          }
          case "string": {
            break;
          }
          case "json": {
            value = value ? JSON.parse(value) : null;
            break;
          }
          default: {
            throw new Error(`Invalid type: ${type}`);
          }
        }
      }
      (0, import_lodash3.default)(config, path2, value);
    }
  }
  return config;
};
var mapToKeyValues = (spec, values) => {
  const config = {};
  for (const [key, { path: path2, type }] of Object.entries(spec)) {
    const value = (0, import_lodash2.default)(values, path2);
    if (value !== void 0) {
      switch (type) {
        case "json":
          config[key] = JSON.stringify(value);
          break;
        default:
          config[key] = value;
      }
    }
  }
  return config;
};
var Config = class {
  constructor(config = {}, ...objects) {
    this._config = sanitizeConfig((0, import_lodash.default)(config, ...objects, {
      version: 1
    }));
  }
  get values() {
    return this._config;
  }
  get(key, defaultValue) {
    return (0, import_lodash2.default)(this._config, key, defaultValue);
  }
  getUnchecked(key, defaultValue) {
    return (0, import_lodash2.default)(this._config, key, defaultValue);
  }
  getOrThrow(key) {
    const value = (0, import_lodash2.default)(this._config, key);
    if (!value) {
      throw new Error(`Config option not present: ${key}`);
    }
    return value;
  }
};

// packages/sdk/config/src/loaders/index.ts
var import_js_yaml = __toESM(require("js-yaml"));
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));

// packages/sdk/config/src/types.ts
var FILE_DEFAULTS = "defaults.yml";
var FILE_ENVS = "envs-map.yml";
var FILE_DYNAMICS = "config.yml";

// packages/sdk/config/src/loaders/index.ts
var DEFAULT_BASE_PATH = import_node_path.default.resolve(process.cwd(), "config");
var maybeLoadFile = (file) => {
  try {
    return import_js_yaml.default.load(import_node_fs.default.readFileSync(file, {
      encoding: "utf8"
    }));
  } catch (err) {
  }
};
var LocalStorage = () => ({});
var Dynamics = () => ({});
var Envs = (basePath = DEFAULT_BASE_PATH) => {
  const content = maybeLoadFile(import_node_path.default.resolve(basePath, FILE_ENVS));
  return content ? mapFromKeyValues(content, process.env) : {};
};
var Defaults = (basePath = DEFAULT_BASE_PATH) => {
  var _a;
  return (_a = maybeLoadFile(import_node_path.default.resolve(basePath, FILE_DEFAULTS))) != null ? _a : {};
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  ConfigProto,
  Defaults,
  Dynamics,
  Envs,
  FILE_DEFAULTS,
  FILE_DYNAMICS,
  FILE_ENVS,
  LocalStorage,
  defs,
  mapFromKeyValues,
  mapToKeyValues
});
