//
// Copyright 2022 DXOS.org
//

export type Struct = Record<string, any>;

export const encodeStructValue = (structValue: any): any => {
  const encoders: Record<string, (v: any) => any> = {
    undefined: () => ({ nullValue: 0 }),
    number: (v: number) => ({ numberValue: v }),
    string: (v: string) => ({ stringValue: v }),
    boolean: (v: boolean) => ({ boolValue: v }),
    object: (v: any) => {
      // null, Array, Object will have typeof 'object'
      if (v === null) {
        return { nullValue: 0 };
      }
      if (Array.isArray(v)) {
        return { listValue: { values: v.map(encodeStructValue) } };
      }
      return { structValue: encodeStruct(v) };
    }
  };
  const valueType = typeof structValue;
  if (valueType in encoders) {
    return encoders[valueType](structValue);
  } else {
    throw new Error(`Unsupported type: ${valueType}`);
  }
};

export const encodeStruct = (struct: Struct): any => ({
  fields: Object.entries(struct).reduce((acc, [key, value]) => {
    acc[key] = encodeStructValue(value);
    return acc;
  }, {} as Record<string, any>)
});

export const decodeStructValue = (value: any): any => {
  const decoders: Record<string, (v: any) => any> = {
    nullValue: () => null,
    numberValue: (v: number) => v,
    stringValue: (v: string) => v,
    boolValue: (v: boolean) => v,
    structValue: (v: Struct) => decodeStruct(v),
    listValue: (v: { values: any[] }) => v.values.map(decodeStructValue)
  };
  const valueType = Object.keys(value)[0];
  if (valueType in decoders) {
    return decoders[valueType](value[valueType]);
  } else {
    throw new Error(`Unsupported type: ${valueType}`);
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
