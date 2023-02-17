import { compress, decompress } from 'compress-json'

export function compressSchema(data: any): any {
  return compress(data);
}

export function decompressSchema(data: any): any {
  return decompress(data);
}