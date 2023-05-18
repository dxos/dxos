//
// Copyright 2022 DXOS.org
//

export type Struct = Record<string, any>;

const encodeStructValue = (structValue: any): any => {
  const valueType = typeof structValue;
  switch (valueType) {
    case 'undefined': {
      return { nullValue: 0 };
    }
    case 'number': {
      return { numberValue: structValue };
    }
    case 'string': {
      return { stringValue: structValue };
    }
    case 'boolean': {
      return { boolValue: structValue };
    }
    case 'object': {
      // null, Array, Object will have typeof 'object'
      if (structValue === null) {
        return { nullValue: 0 };
      }
      if (Array.isArray(structValue)) {
        return { listValue: { values: structValue.map(encodeStructValue) } };
      }
      return { structValue: encodeStruct(structValue) };
    }
    default: {
      throw new Error(`Unsupported type: ${valueType}`);
    }
  }
};

const encodeStruct = (struct: Struct): any => ({
  fields: Object.fromEntries(Object.entries(struct).map(([key, value]) => [key, encodeStructValue(value)])),
});

const decodeStructValue = (structValue: any): any => {
  const [key, v]: [string, any] = Object.entries(structValue)[0];
  switch (key) {
    case 'nullValue': {
      return null;
    }
    case 'numberValue': {
      return v;
    }
    case 'stringValue': {
      return v;
    }
    case 'boolValue': {
      return v;
    }
    case 'structValue': {
      return decodeStruct(v);
    }
    case 'listValue': {
      return v.values.map(decodeStructValue);
    }
    default:
      throw new Error(`Unsupported type: ${key}`);
  }
};

const decodeStruct = (struct: any): Struct =>
  Object.fromEntries(Object.entries(struct.fields || {}).map(([key, value]) => [key, decodeStructValue(value)]));

export const structSubstitutions = {
  'google.protobuf.Struct': {
    encode: (value: Struct): any => encodeStruct(value),
    decode: (value: any): Struct => decodeStruct(value),
  },
};
