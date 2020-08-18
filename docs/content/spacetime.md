# Spacetime

TODO(burdon): Normalize "we" and "current node", etc.

In a decentralized world, no two events can happen simultaneously.

We need a mechanism whereby nodes processing messages from multiple feeds (typically one per peer)
can determine in which order it should process these messages.
In other words, the node needs to determine whether a particular operation should be considered 
to have happened before or after another operation (from a different feed). 

Furthermore, we need all nodes to agree on this ordering -- even when they have different subsets 
of the available information.
NOTE: To achieve consistency, we still typically require CRDTs to deterministically process operations from
multiple nodes that happen (apparently) concurrently.

Feeds consist of ordered message blocks that are implemented via a signed 
[Merkle tree](https://en.wikipedia.org/wiki/Merkle_tree) are replicated using 
the [Hypercore](https://www.datprotocol.com/deps/0002-hypercore).

Feeds are signed using a the private key of the originating node. 
The corresponding public key (or `FeedKey`) is exchanged with peers so that they can verify the integrity of the feed.
Each feed has a genesis block at sequence number 0.
A party consists of a set of feeds -- typically from each of the participating nodes.

Over time, nodes may "discover" additional nodes that have been "admitted" to the party.
NOTE: The admission process is goverened by HALO and out of current scope.

Each time a node writes a new operation to its feed, it adds a Timeframe field to the message block.
A Timeframe is a vector of `<FeedKey x Sequence>` tuple that "anchors" a particular operation in "spacetime"
(the feed is metaphorically analogous to a space, and the sequence number in time).
Each tuple determines the current maximal sequence number (for each known feed) that the current node has processed.
If the node is not currently receiving messages then each message that it writes will just have an increasing
sequence number for its own feed.
NOTE: the sequence number of an operation within its own feed can be implicitely determined so it is
not included in the feeds' Timeframe.

Each Node processes operations one-by-one.
Given multiple feeds to process, we have to determine from which feed we should process the next message.
We can look-ahead at the message at the head of each feed and inspect and compare Timeframes.
We want to select the "earliest" available message (from the feeds that we are currently aware of).
One problem, however, is that at any given point, most nodes will have imperfect information
(i.e., they won't be fully synchronized with all other feeds in the party).

Timeframes are relative to the message that contains them.
They determine the "state" of the node at the point at which the message was created.
NOTE: Each node processes all messages (even its own!) using the same algorithm.

[[TODO(burdon)]] Therefore, the Timeframe at the point when the message is GENERATED may be different from the point
at which it is PROCESSED on the creating node.

Given two messages from two feeds, A and B, we can tell if a particular message from one feed should be processeed
before the other by comparing the sequence number of the opposing feed within each message's Timeframe.
E.g., suppose we are comparing messages from two feeds, A and B, and each message has (by happenstance) a
sequence number of 100.
If the message on feed A (A:100) has the Timeframe `[A:99, B:100]` 
and the Timeframe for the message on feed B (B:100) has the Timeframe `[A:99, B:99]`
then B:100 must be processed before A:100, since B:100 depends on A:99 (which must already have been processed),
and A:100 depends on B:100.

So, to process any message, we must first determine if the current node has already processed ALL of the
messages within that message's Timeframe.
If not, we must continue to process messages from other feeds until we have "caught up".
NOTE: It is possible (likely) that each node will not have synchronized all feeds from other nodes
by the time a particular messages becomes a candidate to be processed. In this case, the node must not 
continue to process messages from any feed who's candidate message depends on missing messages.

NOTE: It is not possible for the process to "deadlock" since it is not possible for messages to have
cyclic dependencies on each other. If message X references message Y in its Timeframe then by necessity,
message Y must have been created BEFORE message X came into existance (and thereforce could not have been
referenced). If this were to happen, the feed containing the message must be invalidated.

In some cases, multiple candidate messages may be able to be processed since all "dependent" messages 
have already been processed. However, in such circumstances each node must make the same deterministic selection.
Therefore, a "tie break" rule determines which message to process first.
For example, the algorithm may pick the message with the lowest sequence number (and in the case of another tie,
the lowest lexcial value of the originating feed's FeedKey.)

NOTE: Since concurrently operating nodes will typically have different subsets of the party feeds synchronized,
it is possible (again, likely!) that different nodes will process some subset of messages in different order,
however, this will only happen for "branches" of messages that are not dependent on each other.
Such messages may be considered to be "concurrent".

For example, consider four nodes with respective feeds A, B, C, and D.
Initially each of the nodes creates messages and synchronizes these with each other.
Suppose that each node writes 100 messages.
At some point, each node will have processed 400 messages (4 x 100), although not necessarily in the same
order since some messges may have been created before the node had fully synchronized with each of its peers.
However, that shouldn't matter, because the mechanism assumes that if a message was crated in the absense of
another message it is determined to be CAUSALLY INDEPENDENT of that message -- and therefore, the two
messages can be processed in arbitrary order.

In these cases, we rely on the underlying CRDTs to maintain a globally consistent state.

At some point, however, suppose the network is partitioned such that feeds A and C continue to synchronize
separately from B and D.

If the two pairs of feeds A and C, and separately B and D now exchange messages they will be free to
process each feed's corresponding messages since there are no dependencies possible with the other
disjoint subgroup. 

Suppose that each node creates another 100 messages.
Now, when each of the four nodes rejoin the same network each subgroup will receive messages from each other.
At this point, each node will have processed 800 messages in total, 
although for the nodes associated with feeds A and B (that were previously separated from each other),
there will now be large sequences of messages (200!) that will have been processed "out of order".

Although extreme, this is in principle no different from the case above where a fully connected set of nodes
are creating and processing messages at the same time.

We can, therefore, consider being "offline" with respect to other peers as an extreme form of "latency",
and rely on the same underlying mechanism.
