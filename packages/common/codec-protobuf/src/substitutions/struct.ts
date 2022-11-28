//
// Copyright 2022 DXOS.org
//

export type Struct = Record<string, any>;

export const encodeStructValue = (structValue: any): any => {
  const valueType = typeof structValue;
  switch (valueType) {
    case 'undefined': {
      return { nullValue: 0 };
      break;
    }
    case 'number': {
      return { numberValue: structValue };
      break;
    }
    case 'string': {
      return { stringValue: structValue };
      break;
    }
    case 'boolean': {
      return { boolValue: structValue };
      break;
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
      break;
    }
    default: {
      throw new Error(`Unsupported type: ${valueType}`);
      break;
    }
  }
};

export const encodeStruct = (struct: Struct): any => ({
  fields: Object.entries(struct).reduce((acc, [key, value]) => {
    acc[key] = encodeStructValue(value);
    return acc;
  }, {} as Record<string, any>)
});

export const decodeStructValue = (value: any): any => {
  const [key, v] = Object.entries(value)[0];
  switch (key) {
    case 'nullValue': {
      return null;
      break;
    }
    case 'numberValue': {
      return v;
      break;
    }
    case 'stringValue': {
      return v;
      break;
    }
    case 'boolValue': {
      return v;
      break;
    }
    case 'structValue': {
      return decodeStruct(v);
      break;
    }
    case 'listValue': {
      return v.values.map(decodeStructValue);
      break;
    }
    default:
      throw new Error(`Unsupported type: ${valueType}`);
      break;
  }
};

export const decodeStruct = (value: any): Struct =>
  Object.entries(value.fields || {}).reduce((acc, [key, value]) => {
    acc[key] = decodeStructValue(value);
    return acc;
  }, {} as Struct);

export const structSubstitutions = {
  'google.protobuf.Struct': {
    encode: (value: Struct): any => encodeStruct(value),
    decode: (value: any): Struct => decodeStruct(value)
  }
};
