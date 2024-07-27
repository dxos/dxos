package dxrpc

import (
	"context"
	"errors"
	"fmt"
	"io"
	"sync"
	"sync/atomic"
	"time"

	rpcpb "github.com/dxos/kube/proto/def/dxos/rpc"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

const (
	SupportPackageIsVersion1 = true
)

// ServiceDesc represents an RPC service's specification.
type ServiceDesc struct {
	ServiceName string
	// The pointer to the service interface. Used to check whether the user
	// provided implementation satisfies the interface requirements.
	HandlerType interface{}
	Methods     []MethodDesc
	Streams     []StreamDesc
	Metadata    interface{}
}

// StreamDesc represents a streaming RPC service's method specification.  Used
// on the server when registering services and on the client when initiating
// new streams.
type StreamDesc struct {
	// StreamName and Handler are only used when registering handlers on a
	// server.
	StreamName string        // the name of the method excluding the service
	Handler    StreamHandler // the handler called for the method

	// ServerStreams and ClientStreams are used for registering handlers on a
	// server as well as defining RPC behavior when passed to NewClientStream
	// and ClientConn.NewStream.
	ServerStreams bool // indicates the server can perform streaming sends
	ClientStreams bool // indicates the client can perform streaming sends
}

// StreamHandler defines the handler called by RPC server to complete the
// execution of a streaming RPC.
type StreamHandler func(srv interface{}, stream ServerStream) error

// ServerStream passed to RPC handlers on the server.
type ServerStream interface {
	Context() context.Context
	SendMsg(m proto.Message) error
	RecvMsg(m proto.Message) error
	Close() error
	Ready()
}

// ClientStream returned by the client when calling streaming RPCs.
type ClientStream interface {
	Context() context.Context
	SendMsg(m proto.Message) error
	RecvMsg(m proto.Message) error
	Close() error
	WaitUntilReady()
}

// ServiceRegistrar wraps a single method that supports service registration. It
// enables users to pass concrete types other than dxrpc.Server to the service
// registration methods exported by the IDL generated code.
type ServiceRegistrar interface {
	// RegisterService registers a service and its implementation to the
	// concrete type implementing this interface.  It may not be called
	// once the server has started serving.
	// desc describes the service and its methods and handlers. impl is the
	// service implementation which is passed to the method handlers.
	RegisterService(desc *ServiceDesc, impl interface{})
}

type MethodDesc struct {
	MethodName string
	Handler    methodHandler
}

type methodHandler func(srv interface{}, ctx context.Context, dec func(message proto.Message) error) (proto.Message, error)

type CallOption interface {
}

type ClientConnInterface interface {
	// Invoke performs a unary RPC and returns after the response is received
	// into reply.
	Invoke(ctx context.Context, method string, args interface{}, reply interface{}, opts ...CallOption) error
	// NewStream begins a streaming RPC.
	NewStream(ctx context.Context, desc *StreamDesc, method string, opts ...CallOption) (ClientStream, error)
}

type Session interface {
	ClientConnInterface
	Done() <-chan struct{}
}

type RPCMessage = *rpcpb.RpcMessage

type RPCPeer struct {
	mu               sync.Mutex
	methods          map[string]rpcMethod
	streams          map[string]rpcStream
	telemetryHandler TelemetryHandler
	log              *zap.SugaredLogger
}

func NewRpcPeer(options ...RpcPeerOption) *RPCPeer {
	rpcPeer := &RPCPeer{
		methods: map[string]rpcMethod{},
		streams: map[string]rpcStream{},
	}

	for _, v := range options {
		v(rpcPeer)
	}

	// Approximate what https://github.com/ipfs/go-log does
	if rpcPeer.log == nil {
		logger, err := zap.NewProduction(zap.IncreaseLevel(zap.InfoLevel), zap.AddCaller())
		if err != nil {
			panic(err)
		}
		rpcPeer.log = logger.Named("dxos:dxrpc").Sugar()
	}

	return rpcPeer
}

type RpcPeerOption func(*RPCPeer)

func WithTelemetryHandler(handler TelemetryHandler) RpcPeerOption {
	return func(p *RPCPeer) {
		p.telemetryHandler = handler
	}
}

func WithLogger(logger *zap.SugaredLogger) RpcPeerOption {
	return func(p *RPCPeer) {
		p.log = logger
	}
}

type session struct {
	peer *RPCPeer

	ctx context.Context

	recv <-chan RPCMessage
	send chan<- RPCMessage

	openServerStreamsMutex sync.Mutex
	openServerStreams      map[int32]*serverStreamImpl

	clientMutex      sync.Mutex
	responseChanByID map[int32]chan<- *rpcpb.Response
	lastId           int32
	telemetryHandler TelemetryHandler
	log              *zap.SugaredLogger
}

type TelemetryHandler interface {
	Success()
	Fail()
	Ping()
	Enabled() bool
}

func (s *session) Done() <-chan struct{} {
	return s.ctx.Done()
}

func NewChanPair() (chan RPCMessage, chan RPCMessage) {
	return make(chan RPCMessage), make(chan RPCMessage)
}

type rpcMethod struct {
	desc *MethodDesc
	impl interface{}
}

type rpcStream struct {
	desc *StreamDesc
	impl interface{}
}

type serverStreamImpl struct {
	ctx          context.Context
	id           int32
	session      *session
	closeContext context.CancelFunc
	recv         chan *[]byte
}

func (s *serverStreamImpl) Ready() {
	s.session.send <- &rpcpb.RpcMessage{
		Content: &rpcpb.RpcMessage_Response{
			Response: &rpcpb.Response{
				Id:      s.id,
				Content: &rpcpb.Response_StreamReady{StreamReady: true},
			},
		},
	}
}

func (s *serverStreamImpl) Context() context.Context {
	return s.ctx
}

func (s *serverStreamImpl) SendMsg(m proto.Message) error {
	payload, err := proto.Marshal(m)
	if err != nil {
		return err
	}

	response := &rpcpb.RpcMessage{
		Content: &rpcpb.RpcMessage_Response{
			Response: &rpcpb.Response{
				Id: s.id,
				Content: &rpcpb.Response_Payload{
					Payload: &anypb.Any{
						TypeUrl: "", // TODO
						Value:   payload,
					},
				},
			},
		},
	}

	s.session.send <- response
	return nil
}

func (s *serverStreamImpl) RecvMsg(m proto.Message) error {
	requestPayload := <-s.recv
	if requestPayload == nil {
		return io.EOF
	}
	return proto.Unmarshal(*requestPayload, m)
}

func (s *serverStreamImpl) Close() error {
	rpcRes := rpcpb.RpcMessage{
		Content: &rpcpb.RpcMessage_Response{
			Response: &rpcpb.Response{
				Id: s.id,
				Content: &rpcpb.Response_Close{
					Close: true,
				},
			},
		},
	}

	s.session.send <- &rpcRes
	var r error = nil
	if err := r; err != nil {
		return err
	}
	return nil
}

func (p *RPCPeer) RegisterService(desc *ServiceDesc, impl interface{}) {
	p.mu.Lock()
	defer p.mu.Unlock()

	serviceName := desc.ServiceName
	for _, method := range desc.Methods {
		m := method
		rpcName := fmt.Sprintf("%s.%s", serviceName, method.MethodName)
		p.methods[rpcName] = rpcMethod{
			desc: &m,
			impl: impl,
		}
	}
	for _, stream := range desc.Streams {
		st := stream
		rpcName := fmt.Sprintf("%s.%s", serviceName, stream.StreamName)
		p.streams[rpcName] = rpcStream{
			desc: &st,
			impl: impl,
		}
	}
}

func (s *session) handleMessage(msg RPCMessage) {
	switch content := msg.Content.(type) {

	case *rpcpb.RpcMessage_Bye:
		s.openServerStreamsMutex.Lock()
		for _, stream := range s.openServerStreams {
			close(stream.recv)
			stream.closeContext()
		}
		s.openServerStreamsMutex.Unlock()

	case *rpcpb.RpcMessage_StreamClose:
		id := content.StreamClose.Id
		s.openServerStreamsMutex.Lock()
		stream, ok := s.openServerStreams[id]
		if ok {
			close(stream.recv)
			stream.closeContext()
			delete(s.openServerStreams, id)
		} else {
			s.log.Infof("No handler for stream (ID %d)", id)
		}
		s.openServerStreamsMutex.Unlock()

	case *rpcpb.RpcMessage_Response:
		id := content.Response.Id
		s.clientMutex.Lock()
		handler, ok := s.responseChanByID[id]
		if ok {
			handler <- content.Response
		} else {
			s.log.Infof("No handler for response (ID %d)", id)
		}
		s.clientMutex.Unlock()

	case *rpcpb.RpcMessage_Request:
		methodName := content.Request.Method

		respondError := func(err *RPCError) {

			s.send <- &rpcpb.RpcMessage{
				Content: &rpcpb.RpcMessage_Response{
					Response: &rpcpb.Response{
						Id: content.Request.Id,
						Content: &rpcpb.Response_Error{
							Error: err.ErrorAsPB(),
						},
					},
				},
			}
		}

		isStream := content.Request.Stream

		if !isStream {
			s.peer.mu.Lock()
			methodDesc, found := s.peer.methods[methodName]
			s.peer.mu.Unlock()

			if !found {
				s.log.Info("No method for ", methodName)
				respondError(NewRPCError("MethodNotFound", fmt.Errorf("no method found for %s", methodName)))
				return
			}
			go func() {
				response, err := methodDesc.desc.Handler(methodDesc.impl, s.ctx, func(dest proto.Message) error {
					return proto.Unmarshal(content.Request.Payload.Value, dest)
				})

				if s.telemetryHandler != nil && s.telemetryHandler.Enabled() {
					if err == nil {
						s.telemetryHandler.Success()
					} else {
						s.telemetryHandler.Fail()
					}
				}

				if err != nil {
					s.log.Errorf("Error in handler for %v (%v)", methodName, err)
					var dxosError *RPCError
					if errors.As(err, &dxosError) {
						respondError(dxosError)
					} else {
						respondError(NewRPCError("HandlerFailed", err))
					}
					return
				}

				payload, err := proto.Marshal(response)
				if err != nil {
					s.log.Errorf("Error marshaling response (%v for %v)", err, response)
					respondError(NewRPCError("ResponseMarshallingFailed", err))

				}

				s.send <- &rpcpb.RpcMessage{
					Content: &rpcpb.RpcMessage_Response{
						Response: &rpcpb.Response{
							Id: content.Request.Id,
							Content: &rpcpb.Response_Payload{
								Payload: &anypb.Any{
									TypeUrl: "", // TODO
									Value:   payload,
								},
							},
						},
					},
				}
			}()
		} else {
			s.peer.mu.Lock()
			streamDesc, found := s.peer.streams[methodName]
			s.peer.mu.Unlock()

			if !found {
				s.log.Errorf("No stream for ", methodName)
				respondError(NewRPCError("StreamNotFound", fmt.Errorf("no stream found for %s", methodName)))
				return
			}

			recv := make(chan *[]byte)

			go func() {
				recv <- &content.Request.Payload.Value
			}()

			ctx, done := context.WithCancel(s.ctx)
			var stream = &serverStreamImpl{
				ctx:          ctx,
				id:           msg.GetRequest().Id,
				recv:         recv,
				closeContext: done,
				session:      s,
			}

			s.openServerStreamsMutex.Lock()
			s.openServerStreams[stream.id] = stream
			s.openServerStreamsMutex.Unlock()

			go func() {
				err := streamDesc.desc.Handler(streamDesc.impl, stream)
				if s.telemetryHandler != nil && s.telemetryHandler.Enabled() {
					if err == nil {
						s.telemetryHandler.Success()
					} else {
						s.telemetryHandler.Fail()
					}
				}
				if err != nil {
					s.log.Errorf("Done with stream %s after error: %s", streamDesc.desc.StreamName, err)
					var dxosError *RPCError
					if errors.As(err, &dxosError) {
						respondError(dxosError)
					} else {
						respondError(NewRPCError("HandlerFailed", err))
					}
					done()
				}
			}()
		}
	}
}

func (s *session) handleChannels() {
	defer func() {
		s.openServerStreamsMutex.Lock()
		defer s.openServerStreamsMutex.Unlock()
		for _, stream := range s.openServerStreams {
			close(stream.recv)
			stream.closeContext()
		}
	}()

	for msg := range s.recv {
		s.handleMessage(msg)
	}
}

func (p *RPCPeer) Connect(ctx context.Context, recv <-chan RPCMessage, send chan<- RPCMessage) Session {
	s := session{
		peer:                   p,
		ctx:                    ctx,
		recv:                   recv,
		send:                   send,
		openServerStreamsMutex: sync.Mutex{},
		openServerStreams:      map[int32]*serverStreamImpl{},
		clientMutex:            sync.Mutex{},
		responseChanByID:       map[int32]chan<- *rpcpb.Response{},
		lastId:                 -1,
		telemetryHandler:       p.telemetryHandler,
		log:                    p.log,
	}
	go s.handleChannels()

	return &s
}

func (p *RPCPeer) HandleWebsocket(conn *websocket.Conn, ctx context.Context) Session {
	sctx, cancel := context.WithCancel(ctx)

	recv := make(chan RPCMessage)
	send := make(chan RPCMessage)

	session := p.Connect(sctx, recv, send)

	conn.SetCloseHandler(func(code int, text string) error {
		cancel()
		message := websocket.FormatCloseMessage(code, "")
		_ = conn.WriteControl(websocket.CloseMessage, message, time.Now().Add(time.Second))
		return nil
	})

	go func() {
		<-session.Done()
		close(recv)
		_ = conn.Close()
	}()

	go func() {
		defer cancel()

		for {
			select {
			case <-session.Done():
				return
			case msg := <-send:
				bytes, err := proto.Marshal(msg)
				if err != nil {
					p.log.Fatalf("Could not serialize message: %v", err)
				}
				err = conn.WriteMessage(websocket.BinaryMessage, bytes)
				if err != nil {
					if websocket.IsUnexpectedCloseError(err,
						websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
						p.log.Infof("Connection closed unexpectedly during write: %v", err)
					}
					return
				}
			}
		}
	}()

	go func() {
		defer cancel()

		for {
			select {
			case <-ctx.Done():
				return
			case <-session.Done():
				return
			default:
				typ, bytes, err := conn.ReadMessage()
				if err != nil {
					if websocket.IsUnexpectedCloseError(err,
						websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
						p.log.Infof("Connection closed unexpectedly during read: %v", err)
					}
					return
				}
				if typ != websocket.BinaryMessage {
					if typ == websocket.TextMessage {
						if string(bytes) == "__ping__" {
							// TODO(nf): implement pong?
							if p.telemetryHandler != nil && p.telemetryHandler.Enabled() {
								p.telemetryHandler.Ping()
							}
						} else {
							p.log.Warnf("Received unknown text message \"%s\", ignoring", string(bytes))
						}
						// TODO(nf): implement websocket.PongMessage if browsers ever support?
					} else {
						p.log.Warn("Received unknown message type, ignoring", "type", typ)
					}
					continue
				}
				var msg rpcpb.RpcMessage
				err = proto.Unmarshal(bytes, &msg)
				if err != nil {
					p.log.Warnf("Unmarshalling failed (%v), closing", err)
					return
				}
				recv <- &msg
			}
		}
	}()

	return session
}

func (s *session) Invoke(ctx context.Context, method string, args interface{}, reply interface{}, opts ...CallOption) error {
	payload, err := proto.Marshal(args.(proto.Message))

	if err != nil {
		msg := fmt.Sprintf("Args do not serialize: %v", err)
		s.log.Warnf("Invoke failed on arguments: %v", msg)
		return errors.New(msg)
	}

	id := atomic.AddInt32(&s.lastId, 1)

	channel := make(chan *rpcpb.Response)
	s.clientMutex.Lock()
	s.responseChanByID[id] = channel
	s.clientMutex.Unlock()

	s.send <- &rpcpb.RpcMessage{
		Content: &rpcpb.RpcMessage_Request{
			Request: &rpcpb.Request{
				Id:     id,
				Method: method,
				Payload: &anypb.Any{
					TypeUrl: "", // TODO
					Value:   payload,
				},
				Stream: false,
			},
		},
	}

	res := <-channel
	close(channel)
	s.clientMutex.Lock()
	delete(s.responseChanByID, id)
	s.clientMutex.Unlock()

	switch payload := res.Content.(type) {
	case *rpcpb.Response_Payload:
		proto.Unmarshal(payload.Payload.Value, reply.(proto.Message))
	case *rpcpb.Response_Error:
		err := payload.Error
		return fmt.Errorf("%v: %v", err.Name, err.Message)
	}

	return nil
}

func (s *session) NewStream(ctx context.Context, desc *StreamDesc, method string, opts ...CallOption) (ClientStream, error) {
	id := atomic.AddInt32(&s.lastId, 1)

	responses := make(chan *rpcpb.Response)
	messages := make(chan *rpcpb.Response)
	streamReadyCh := make(chan struct{})
	streamReady := false

	s.clientMutex.Lock()
	s.responseChanByID[id] = responses
	s.clientMutex.Unlock()

	go func() {
		for response := range responses {
			if response.GetStreamReady() && !streamReady {
				close(streamReadyCh)
				streamReady = true
			} else {
				if !streamReady {
					close(streamReadyCh)
					streamReady = true
				}
				messages <- response
			}
		}
		if !streamReady {
			close(streamReadyCh)
		}
		close(messages)
	}()

	return &clientStreamImpl{
		id:          id,
		session:     s,
		ctx:         ctx,
		method:      method,
		responses:   responses,
		messages:    messages,
		streamReady: streamReadyCh,
	}, nil
}

type clientStreamImpl struct {
	id          int32
	session     *session
	ctx         context.Context
	method      string
	responses   <-chan *rpcpb.Response
	messages    <-chan *rpcpb.Response
	streamReady <-chan struct{}
}

func (c *clientStreamImpl) WaitUntilReady() {
	<-c.streamReady
}

func (c *clientStreamImpl) Close() error {
	c.session.send <- &rpcpb.RpcMessage{
		Content: &rpcpb.RpcMessage_StreamClose{
			StreamClose: &rpcpb.StreamClose{
				Id: c.id,
			},
		},
	}
	return nil
}

func (c *clientStreamImpl) Context() context.Context {
	return c.ctx
}

func (c *clientStreamImpl) SendMsg(m proto.Message) error {
	payload, err := proto.Marshal(m)
	if err != nil {
		return err
	}

	c.session.send <- &rpcpb.RpcMessage{
		Content: &rpcpb.RpcMessage_Request{
			Request: &rpcpb.Request{
				Id:     c.id,
				Method: c.method,
				Payload: &anypb.Any{
					TypeUrl: "", // TODO
					Value:   payload,
				},
				Stream: true,
			},
		},
	}

	return nil
}

func (c *clientStreamImpl) RecvMsg(m proto.Message) error {
	select {
	case <-(*c).ctx.Done():
		return io.EOF
	case <-(*c).session.ctx.Done():
		return io.EOF
	case res := <-c.messages:
		if res == nil {
			return io.EOF
		}
		switch payload := res.Content.(type) {
		case *rpcpb.Response_Close:
			return io.EOF
		case *rpcpb.Response_Payload:
			return proto.Unmarshal(payload.Payload.Value, m.(proto.Message))
		case *rpcpb.Response_Error:
			err := payload.Error
			// FIXME: Close stream and cleanup stuff
			return fmt.Errorf("%s: %s", *err.Name, *err.Message)
		}
		return nil
	}
}
