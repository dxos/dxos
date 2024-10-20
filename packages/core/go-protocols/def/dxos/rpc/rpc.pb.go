//
// Copyright 2020 DXOS.org
//

// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.33.0
// 	protoc        v3.20.3
// source: dxos/rpc.proto

// TODO(burdon): Move to `dxos.mesh.rpc` (reconcile with @dxos/kube repo).

package rpc

import (
	error1 "github.com/dxos/dxos/proto/def/dxos/error"
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	anypb "google.golang.org/protobuf/types/known/anypb"
	reflect "reflect"
	sync "sync"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

type MessageTrace_Direction int32

const (
	MessageTrace_INCOMING MessageTrace_Direction = 0
	MessageTrace_OUTGOING MessageTrace_Direction = 1
)

// Enum value maps for MessageTrace_Direction.
var (
	MessageTrace_Direction_name = map[int32]string{
		0: "INCOMING",
		1: "OUTGOING",
	}
	MessageTrace_Direction_value = map[string]int32{
		"INCOMING": 0,
		"OUTGOING": 1,
	}
)

func (x MessageTrace_Direction) Enum() *MessageTrace_Direction {
	p := new(MessageTrace_Direction)
	*p = x
	return p
}

func (x MessageTrace_Direction) String() string {
	return protoimpl.X.EnumStringOf(x.Descriptor(), protoreflect.EnumNumber(x))
}

func (MessageTrace_Direction) Descriptor() protoreflect.EnumDescriptor {
	return file_dxos_rpc_proto_enumTypes[0].Descriptor()
}

func (MessageTrace_Direction) Type() protoreflect.EnumType {
	return &file_dxos_rpc_proto_enumTypes[0]
}

func (x MessageTrace_Direction) Number() protoreflect.EnumNumber {
	return protoreflect.EnumNumber(x)
}

// Deprecated: Use MessageTrace_Direction.Descriptor instead.
func (MessageTrace_Direction) EnumDescriptor() ([]byte, []int) {
	return file_dxos_rpc_proto_rawDescGZIP(), []int{4, 0}
}

type RpcMessage struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	// Types that are assignable to Content:
	//
	//	*RpcMessage_Request
	//	*RpcMessage_Response
	//	*RpcMessage_Open
	//	*RpcMessage_OpenAck
	//	*RpcMessage_StreamClose
	//	*RpcMessage_Bye
	Content isRpcMessage_Content `protobuf_oneof:"content"`
}

func (x *RpcMessage) Reset() {
	*x = RpcMessage{}
	if protoimpl.UnsafeEnabled {
		mi := &file_dxos_rpc_proto_msgTypes[0]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *RpcMessage) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*RpcMessage) ProtoMessage() {}

func (x *RpcMessage) ProtoReflect() protoreflect.Message {
	mi := &file_dxos_rpc_proto_msgTypes[0]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use RpcMessage.ProtoReflect.Descriptor instead.
func (*RpcMessage) Descriptor() ([]byte, []int) {
	return file_dxos_rpc_proto_rawDescGZIP(), []int{0}
}

func (m *RpcMessage) GetContent() isRpcMessage_Content {
	if m != nil {
		return m.Content
	}
	return nil
}

func (x *RpcMessage) GetRequest() *Request {
	if x, ok := x.GetContent().(*RpcMessage_Request); ok {
		return x.Request
	}
	return nil
}

func (x *RpcMessage) GetResponse() *Response {
	if x, ok := x.GetContent().(*RpcMessage_Response); ok {
		return x.Response
	}
	return nil
}

func (x *RpcMessage) GetOpen() bool {
	if x, ok := x.GetContent().(*RpcMessage_Open); ok {
		return x.Open
	}
	return false
}

func (x *RpcMessage) GetOpenAck() bool {
	if x, ok := x.GetContent().(*RpcMessage_OpenAck); ok {
		return x.OpenAck
	}
	return false
}

func (x *RpcMessage) GetStreamClose() *StreamClose {
	if x, ok := x.GetContent().(*RpcMessage_StreamClose); ok {
		return x.StreamClose
	}
	return nil
}

func (x *RpcMessage) GetBye() *Bye {
	if x, ok := x.GetContent().(*RpcMessage_Bye); ok {
		return x.Bye
	}
	return nil
}

type isRpcMessage_Content interface {
	isRpcMessage_Content()
}

type RpcMessage_Request struct {
	Request *Request `protobuf:"bytes,1,opt,name=request,proto3,oneof"`
}

type RpcMessage_Response struct {
	Response *Response `protobuf:"bytes,2,opt,name=response,proto3,oneof"`
}

type RpcMessage_Open struct {
	// / Means that the node is trying to open the connection.
	Open bool `protobuf:"varint,3,opt,name=open,proto3,oneof"`
}

type RpcMessage_OpenAck struct {
	// / Means that the node has received the "open" message and is ready to perform requests.
	OpenAck bool `protobuf:"varint,4,opt,name=open_ack,json=openAck,proto3,oneof"`
}

type RpcMessage_StreamClose struct {
	StreamClose *StreamClose `protobuf:"bytes,5,opt,name=stream_close,json=streamClose,proto3,oneof"`
}

type RpcMessage_Bye struct {
	// / Request to close the connection.
	Bye *Bye `protobuf:"bytes,6,opt,name=bye,proto3,oneof"`
}

func (*RpcMessage_Request) isRpcMessage_Content() {}

func (*RpcMessage_Response) isRpcMessage_Content() {}

func (*RpcMessage_Open) isRpcMessage_Content() {}

func (*RpcMessage_OpenAck) isRpcMessage_Content() {}

func (*RpcMessage_StreamClose) isRpcMessage_Content() {}

func (*RpcMessage_Bye) isRpcMessage_Content() {}

type Request struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Id      int32      `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
	Method  string     `protobuf:"bytes,2,opt,name=method,proto3" json:"method,omitempty"`
	Payload *anypb.Any `protobuf:"bytes,3,opt,name=payload,proto3" json:"payload,omitempty"`
	Stream  bool       `protobuf:"varint,4,opt,name=stream,proto3" json:"stream,omitempty"`
}

func (x *Request) Reset() {
	*x = Request{}
	if protoimpl.UnsafeEnabled {
		mi := &file_dxos_rpc_proto_msgTypes[1]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *Request) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Request) ProtoMessage() {}

func (x *Request) ProtoReflect() protoreflect.Message {
	mi := &file_dxos_rpc_proto_msgTypes[1]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Request.ProtoReflect.Descriptor instead.
func (*Request) Descriptor() ([]byte, []int) {
	return file_dxos_rpc_proto_rawDescGZIP(), []int{1}
}

func (x *Request) GetId() int32 {
	if x != nil {
		return x.Id
	}
	return 0
}

func (x *Request) GetMethod() string {
	if x != nil {
		return x.Method
	}
	return ""
}

func (x *Request) GetPayload() *anypb.Any {
	if x != nil {
		return x.Payload
	}
	return nil
}

func (x *Request) GetStream() bool {
	if x != nil {
		return x.Stream
	}
	return false
}

type Response struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Id int32 `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
	// Types that are assignable to Content:
	//
	//	*Response_Payload
	//	*Response_Error
	//	*Response_Close
	//	*Response_StreamReady
	Content isResponse_Content `protobuf_oneof:"content"`
}

func (x *Response) Reset() {
	*x = Response{}
	if protoimpl.UnsafeEnabled {
		mi := &file_dxos_rpc_proto_msgTypes[2]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *Response) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Response) ProtoMessage() {}

func (x *Response) ProtoReflect() protoreflect.Message {
	mi := &file_dxos_rpc_proto_msgTypes[2]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Response.ProtoReflect.Descriptor instead.
func (*Response) Descriptor() ([]byte, []int) {
	return file_dxos_rpc_proto_rawDescGZIP(), []int{2}
}

func (x *Response) GetId() int32 {
	if x != nil {
		return x.Id
	}
	return 0
}

func (m *Response) GetContent() isResponse_Content {
	if m != nil {
		return m.Content
	}
	return nil
}

func (x *Response) GetPayload() *anypb.Any {
	if x, ok := x.GetContent().(*Response_Payload); ok {
		return x.Payload
	}
	return nil
}

func (x *Response) GetError() *error1.Error {
	if x, ok := x.GetContent().(*Response_Error); ok {
		return x.Error
	}
	return nil
}

func (x *Response) GetClose() bool {
	if x, ok := x.GetContent().(*Response_Close); ok {
		return x.Close
	}
	return false
}

func (x *Response) GetStreamReady() bool {
	if x, ok := x.GetContent().(*Response_StreamReady); ok {
		return x.StreamReady
	}
	return false
}

type isResponse_Content interface {
	isResponse_Content()
}

type Response_Payload struct {
	Payload *anypb.Any `protobuf:"bytes,2,opt,name=payload,proto3,oneof"`
}

type Response_Error struct {
	Error *error1.Error `protobuf:"bytes,3,opt,name=error,proto3,oneof"`
}

type Response_Close struct {
	// / Sent when stream is closed without an error.
	Close bool `protobuf:"varint,4,opt,name=close,proto3,oneof"`
}

type Response_StreamReady struct {
	// *
	// Sent when the server has processed a request with a streaming response.
	// Can be skipped by the server.
	// In this case the first payload should be treated as the server being ready.
	StreamReady bool `protobuf:"varint,5,opt,name=stream_ready,json=streamReady,proto3,oneof"`
}

func (*Response_Payload) isResponse_Content() {}

func (*Response_Error) isResponse_Content() {}

func (*Response_Close) isResponse_Content() {}

func (*Response_StreamReady) isResponse_Content() {}

// TODO(burdon): Generalize to event?
// Sent by client to end the streaming response.
type StreamClose struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Id int32 `protobuf:"varint,1,opt,name=id,proto3" json:"id,omitempty"`
}

func (x *StreamClose) Reset() {
	*x = StreamClose{}
	if protoimpl.UnsafeEnabled {
		mi := &file_dxos_rpc_proto_msgTypes[3]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *StreamClose) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*StreamClose) ProtoMessage() {}

func (x *StreamClose) ProtoReflect() protoreflect.Message {
	mi := &file_dxos_rpc_proto_msgTypes[3]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use StreamClose.ProtoReflect.Descriptor instead.
func (*StreamClose) Descriptor() ([]byte, []int) {
	return file_dxos_rpc_proto_rawDescGZIP(), []int{3}
}

func (x *StreamClose) GetId() int32 {
	if x != nil {
		return x.Id
	}
	return 0
}

// TODO(burdon): Rename Trace.
type MessageTrace struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Direction MessageTrace_Direction `protobuf:"varint,1,opt,name=direction,proto3,enum=dxos.rpc.MessageTrace_Direction" json:"direction,omitempty"`
	Data      []byte                 `protobuf:"bytes,2,opt,name=data,proto3" json:"data,omitempty"`
}

func (x *MessageTrace) Reset() {
	*x = MessageTrace{}
	if protoimpl.UnsafeEnabled {
		mi := &file_dxos_rpc_proto_msgTypes[4]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *MessageTrace) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*MessageTrace) ProtoMessage() {}

func (x *MessageTrace) ProtoReflect() protoreflect.Message {
	mi := &file_dxos_rpc_proto_msgTypes[4]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use MessageTrace.ProtoReflect.Descriptor instead.
func (*MessageTrace) Descriptor() ([]byte, []int) {
	return file_dxos_rpc_proto_rawDescGZIP(), []int{4}
}

func (x *MessageTrace) GetDirection() MessageTrace_Direction {
	if x != nil {
		return x.Direction
	}
	return MessageTrace_INCOMING
}

func (x *MessageTrace) GetData() []byte {
	if x != nil {
		return x.Data
	}
	return nil
}

// *
// Request to close the connection.
// Connection is closed once both sides have received the Bye message.
type Bye struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields
}

func (x *Bye) Reset() {
	*x = Bye{}
	if protoimpl.UnsafeEnabled {
		mi := &file_dxos_rpc_proto_msgTypes[5]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *Bye) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Bye) ProtoMessage() {}

func (x *Bye) ProtoReflect() protoreflect.Message {
	mi := &file_dxos_rpc_proto_msgTypes[5]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use Bye.ProtoReflect.Descriptor instead.
func (*Bye) Descriptor() ([]byte, []int) {
	return file_dxos_rpc_proto_rawDescGZIP(), []int{5}
}

var File_dxos_rpc_proto protoreflect.FileDescriptor

var file_dxos_rpc_proto_rawDesc = []byte{
	0x0a, 0x0e, 0x64, 0x78, 0x6f, 0x73, 0x2f, 0x72, 0x70, 0x63, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f,
	0x12, 0x08, 0x64, 0x78, 0x6f, 0x73, 0x2e, 0x72, 0x70, 0x63, 0x1a, 0x19, 0x67, 0x6f, 0x6f, 0x67,
	0x6c, 0x65, 0x2f, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x62, 0x75, 0x66, 0x2f, 0x61, 0x6e, 0x79, 0x2e,
	0x70, 0x72, 0x6f, 0x74, 0x6f, 0x1a, 0x10, 0x64, 0x78, 0x6f, 0x73, 0x2f, 0x65, 0x72, 0x72, 0x6f,
	0x72, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x22, 0x8a, 0x02, 0x0a, 0x0a, 0x52, 0x70, 0x63, 0x4d,
	0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x12, 0x2d, 0x0a, 0x07, 0x72, 0x65, 0x71, 0x75, 0x65, 0x73,
	0x74, 0x18, 0x01, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x11, 0x2e, 0x64, 0x78, 0x6f, 0x73, 0x2e, 0x72,
	0x70, 0x63, 0x2e, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x48, 0x00, 0x52, 0x07, 0x72, 0x65,
	0x71, 0x75, 0x65, 0x73, 0x74, 0x12, 0x30, 0x0a, 0x08, 0x72, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73,
	0x65, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x12, 0x2e, 0x64, 0x78, 0x6f, 0x73, 0x2e, 0x72,
	0x70, 0x63, 0x2e, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x48, 0x00, 0x52, 0x08, 0x72,
	0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x14, 0x0a, 0x04, 0x6f, 0x70, 0x65, 0x6e, 0x18,
	0x03, 0x20, 0x01, 0x28, 0x08, 0x48, 0x00, 0x52, 0x04, 0x6f, 0x70, 0x65, 0x6e, 0x12, 0x1b, 0x0a,
	0x08, 0x6f, 0x70, 0x65, 0x6e, 0x5f, 0x61, 0x63, 0x6b, 0x18, 0x04, 0x20, 0x01, 0x28, 0x08, 0x48,
	0x00, 0x52, 0x07, 0x6f, 0x70, 0x65, 0x6e, 0x41, 0x63, 0x6b, 0x12, 0x3a, 0x0a, 0x0c, 0x73, 0x74,
	0x72, 0x65, 0x61, 0x6d, 0x5f, 0x63, 0x6c, 0x6f, 0x73, 0x65, 0x18, 0x05, 0x20, 0x01, 0x28, 0x0b,
	0x32, 0x15, 0x2e, 0x64, 0x78, 0x6f, 0x73, 0x2e, 0x72, 0x70, 0x63, 0x2e, 0x53, 0x74, 0x72, 0x65,
	0x61, 0x6d, 0x43, 0x6c, 0x6f, 0x73, 0x65, 0x48, 0x00, 0x52, 0x0b, 0x73, 0x74, 0x72, 0x65, 0x61,
	0x6d, 0x43, 0x6c, 0x6f, 0x73, 0x65, 0x12, 0x21, 0x0a, 0x03, 0x62, 0x79, 0x65, 0x18, 0x06, 0x20,
	0x01, 0x28, 0x0b, 0x32, 0x0d, 0x2e, 0x64, 0x78, 0x6f, 0x73, 0x2e, 0x72, 0x70, 0x63, 0x2e, 0x42,
	0x79, 0x65, 0x48, 0x00, 0x52, 0x03, 0x62, 0x79, 0x65, 0x42, 0x09, 0x0a, 0x07, 0x63, 0x6f, 0x6e,
	0x74, 0x65, 0x6e, 0x74, 0x22, 0x79, 0x0a, 0x07, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x12,
	0x0e, 0x0a, 0x02, 0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x05, 0x52, 0x02, 0x69, 0x64, 0x12,
	0x16, 0x0a, 0x06, 0x6d, 0x65, 0x74, 0x68, 0x6f, 0x64, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x06, 0x6d, 0x65, 0x74, 0x68, 0x6f, 0x64, 0x12, 0x2e, 0x0a, 0x07, 0x70, 0x61, 0x79, 0x6c, 0x6f,
	0x61, 0x64, 0x18, 0x03, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x14, 0x2e, 0x67, 0x6f, 0x6f, 0x67, 0x6c,
	0x65, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x62, 0x75, 0x66, 0x2e, 0x41, 0x6e, 0x79, 0x52, 0x07,
	0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x12, 0x16, 0x0a, 0x06, 0x73, 0x74, 0x72, 0x65, 0x61,
	0x6d, 0x18, 0x04, 0x20, 0x01, 0x28, 0x08, 0x52, 0x06, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x22,
	0xbf, 0x01, 0x0a, 0x08, 0x52, 0x65, 0x73, 0x70, 0x6f, 0x6e, 0x73, 0x65, 0x12, 0x0e, 0x0a, 0x02,
	0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x05, 0x52, 0x02, 0x69, 0x64, 0x12, 0x30, 0x0a, 0x07,
	0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x14, 0x2e,
	0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x62, 0x75, 0x66, 0x2e,
	0x41, 0x6e, 0x79, 0x48, 0x00, 0x52, 0x07, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x12, 0x29,
	0x0a, 0x05, 0x65, 0x72, 0x72, 0x6f, 0x72, 0x18, 0x03, 0x20, 0x01, 0x28, 0x0b, 0x32, 0x11, 0x2e,
	0x64, 0x78, 0x6f, 0x73, 0x2e, 0x65, 0x72, 0x72, 0x6f, 0x72, 0x2e, 0x45, 0x72, 0x72, 0x6f, 0x72,
	0x48, 0x00, 0x52, 0x05, 0x65, 0x72, 0x72, 0x6f, 0x72, 0x12, 0x16, 0x0a, 0x05, 0x63, 0x6c, 0x6f,
	0x73, 0x65, 0x18, 0x04, 0x20, 0x01, 0x28, 0x08, 0x48, 0x00, 0x52, 0x05, 0x63, 0x6c, 0x6f, 0x73,
	0x65, 0x12, 0x23, 0x0a, 0x0c, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x5f, 0x72, 0x65, 0x61, 0x64,
	0x79, 0x18, 0x05, 0x20, 0x01, 0x28, 0x08, 0x48, 0x00, 0x52, 0x0b, 0x73, 0x74, 0x72, 0x65, 0x61,
	0x6d, 0x52, 0x65, 0x61, 0x64, 0x79, 0x42, 0x09, 0x0a, 0x07, 0x63, 0x6f, 0x6e, 0x74, 0x65, 0x6e,
	0x74, 0x22, 0x1d, 0x0a, 0x0b, 0x53, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x43, 0x6c, 0x6f, 0x73, 0x65,
	0x12, 0x0e, 0x0a, 0x02, 0x69, 0x64, 0x18, 0x01, 0x20, 0x01, 0x28, 0x05, 0x52, 0x02, 0x69, 0x64,
	0x22, 0x8b, 0x01, 0x0a, 0x0c, 0x4d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x54, 0x72, 0x61, 0x63,
	0x65, 0x12, 0x3e, 0x0a, 0x09, 0x64, 0x69, 0x72, 0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x18, 0x01,
	0x20, 0x01, 0x28, 0x0e, 0x32, 0x20, 0x2e, 0x64, 0x78, 0x6f, 0x73, 0x2e, 0x72, 0x70, 0x63, 0x2e,
	0x4d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x54, 0x72, 0x61, 0x63, 0x65, 0x2e, 0x44, 0x69, 0x72,
	0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x52, 0x09, 0x64, 0x69, 0x72, 0x65, 0x63, 0x74, 0x69, 0x6f,
	0x6e, 0x12, 0x12, 0x0a, 0x04, 0x64, 0x61, 0x74, 0x61, 0x18, 0x02, 0x20, 0x01, 0x28, 0x0c, 0x52,
	0x04, 0x64, 0x61, 0x74, 0x61, 0x22, 0x27, 0x0a, 0x09, 0x44, 0x69, 0x72, 0x65, 0x63, 0x74, 0x69,
	0x6f, 0x6e, 0x12, 0x0c, 0x0a, 0x08, 0x49, 0x4e, 0x43, 0x4f, 0x4d, 0x49, 0x4e, 0x47, 0x10, 0x00,
	0x12, 0x0c, 0x0a, 0x08, 0x4f, 0x55, 0x54, 0x47, 0x4f, 0x49, 0x4e, 0x47, 0x10, 0x01, 0x22, 0x05,
	0x0a, 0x03, 0x42, 0x79, 0x65, 0x42, 0x29, 0x5a, 0x27, 0x67, 0x69, 0x74, 0x68, 0x75, 0x62, 0x2e,
	0x63, 0x6f, 0x6d, 0x2f, 0x64, 0x78, 0x6f, 0x73, 0x2f, 0x64, 0x78, 0x6f, 0x73, 0x2f, 0x70, 0x72,
	0x6f, 0x74, 0x6f, 0x2f, 0x64, 0x65, 0x66, 0x2f, 0x64, 0x78, 0x6f, 0x73, 0x2f, 0x72, 0x70, 0x63,
	0x62, 0x06, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x33,
}

var (
	file_dxos_rpc_proto_rawDescOnce sync.Once
	file_dxos_rpc_proto_rawDescData = file_dxos_rpc_proto_rawDesc
)

func file_dxos_rpc_proto_rawDescGZIP() []byte {
	file_dxos_rpc_proto_rawDescOnce.Do(func() {
		file_dxos_rpc_proto_rawDescData = protoimpl.X.CompressGZIP(file_dxos_rpc_proto_rawDescData)
	})
	return file_dxos_rpc_proto_rawDescData
}

var file_dxos_rpc_proto_enumTypes = make([]protoimpl.EnumInfo, 1)
var file_dxos_rpc_proto_msgTypes = make([]protoimpl.MessageInfo, 6)
var file_dxos_rpc_proto_goTypes = []interface{}{
	(MessageTrace_Direction)(0), // 0: dxos.rpc.MessageTrace.Direction
	(*RpcMessage)(nil),          // 1: dxos.rpc.RpcMessage
	(*Request)(nil),             // 2: dxos.rpc.Request
	(*Response)(nil),            // 3: dxos.rpc.Response
	(*StreamClose)(nil),         // 4: dxos.rpc.StreamClose
	(*MessageTrace)(nil),        // 5: dxos.rpc.MessageTrace
	(*Bye)(nil),                 // 6: dxos.rpc.Bye
	(*anypb.Any)(nil),           // 7: google.protobuf.Any
	(*error1.Error)(nil),        // 8: dxos.error.Error
}
var file_dxos_rpc_proto_depIdxs = []int32{
	2, // 0: dxos.rpc.RpcMessage.request:type_name -> dxos.rpc.Request
	3, // 1: dxos.rpc.RpcMessage.response:type_name -> dxos.rpc.Response
	4, // 2: dxos.rpc.RpcMessage.stream_close:type_name -> dxos.rpc.StreamClose
	6, // 3: dxos.rpc.RpcMessage.bye:type_name -> dxos.rpc.Bye
	7, // 4: dxos.rpc.Request.payload:type_name -> google.protobuf.Any
	7, // 5: dxos.rpc.Response.payload:type_name -> google.protobuf.Any
	8, // 6: dxos.rpc.Response.error:type_name -> dxos.error.Error
	0, // 7: dxos.rpc.MessageTrace.direction:type_name -> dxos.rpc.MessageTrace.Direction
	8, // [8:8] is the sub-list for method output_type
	8, // [8:8] is the sub-list for method input_type
	8, // [8:8] is the sub-list for extension type_name
	8, // [8:8] is the sub-list for extension extendee
	0, // [0:8] is the sub-list for field type_name
}

func init() { file_dxos_rpc_proto_init() }
func file_dxos_rpc_proto_init() {
	if File_dxos_rpc_proto != nil {
		return
	}
	if !protoimpl.UnsafeEnabled {
		file_dxos_rpc_proto_msgTypes[0].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*RpcMessage); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_dxos_rpc_proto_msgTypes[1].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*Request); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_dxos_rpc_proto_msgTypes[2].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*Response); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_dxos_rpc_proto_msgTypes[3].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*StreamClose); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_dxos_rpc_proto_msgTypes[4].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*MessageTrace); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_dxos_rpc_proto_msgTypes[5].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*Bye); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
	}
	file_dxos_rpc_proto_msgTypes[0].OneofWrappers = []interface{}{
		(*RpcMessage_Request)(nil),
		(*RpcMessage_Response)(nil),
		(*RpcMessage_Open)(nil),
		(*RpcMessage_OpenAck)(nil),
		(*RpcMessage_StreamClose)(nil),
		(*RpcMessage_Bye)(nil),
	}
	file_dxos_rpc_proto_msgTypes[2].OneofWrappers = []interface{}{
		(*Response_Payload)(nil),
		(*Response_Error)(nil),
		(*Response_Close)(nil),
		(*Response_StreamReady)(nil),
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: file_dxos_rpc_proto_rawDesc,
			NumEnums:      1,
			NumMessages:   6,
			NumExtensions: 0,
			NumServices:   0,
		},
		GoTypes:           file_dxos_rpc_proto_goTypes,
		DependencyIndexes: file_dxos_rpc_proto_depIdxs,
		EnumInfos:         file_dxos_rpc_proto_enumTypes,
		MessageInfos:      file_dxos_rpc_proto_msgTypes,
	}.Build()
	File_dxos_rpc_proto = out.File
	file_dxos_rpc_proto_rawDesc = nil
	file_dxos_rpc_proto_goTypes = nil
	file_dxos_rpc_proto_depIdxs = nil
}
