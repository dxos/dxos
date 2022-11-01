TODO(burdon): Cleanup

http://noiseprotocol.org/noise.html

1. we have a general network abstraction where you can be connected to one or more peers via a discovery key (topic/swarm)
2. that "connection" contains a single duplex stream with which you can communicated with the peer
Q (for after the summary: where is the key exchange, encryption, noise, etc. done?)
3. we have a low-level multiplexer that handles plexing of virtual "channels" identified by a string. by convention the id is a hierarchical path -- but that's arbitrary.
4. these channels are binary streams (on which are encoded protocol buffer messages).
5. all of that is DXOS agnostic (in common with no core/protocols deps) 
6. on top of this we can build TWO kinds of things: a) RPC; b) Feed replication
7. the first RPC we build is CONTROL (Q for end) 
8. the next is INVITATION
9. the next is FEED REPLICATION
10. these are all built on top of channel handlers 
11. but the RPC channel handlers have their own abstraction