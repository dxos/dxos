import pb from 'protobufjs'

/**
 * Manually adds descriptor proto to the list of common protobuf definitions.
 */
export function preconfigureProtobufjs() {
  pb.common('descriptor', require('protobufjs/google/protobuf/descriptor.json'));
}
