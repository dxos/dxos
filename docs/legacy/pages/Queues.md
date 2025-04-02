# Edge Queues
- ## Design
- Belongs to a space (identified as space id)
	- [RB]: Could have multiple per space; queue ID separate; parentID is space.
	- Used for sharding
	- Different kind of space then the usual echo space
	- multiple queues per space
- Each queue is identified by its ID
	- Same schema as ObjectID
	- Queue has a DXN of `dxn:queue:<spaceId>:<queueId>`
		- [RB]: dxn:edge:queue?
- Queues are automatically created when the first object is inserted
- Queues contain typed ECHO objects
	- Each object has an echo id
		- [RB]: Effectively yes, but strictly just a typed object (schema).
		- Each object in a queue can be identified with `dxn:queue:<spaceId>:<queueId>:<objectId>`
	- Each has a typename (with version and schema reference)
	- Single queue can contain objects of mixed types
- Queue orders the objects in the insertion order
	- Consumers can query the front/tail of the queue
		- Queues expose opaque cursors that can be used for ranged queries - client maintains cursor.
			- ~~[RB]: I think this can be simplified to a range query (client maintains cursor).~~
	- Consumers can delete objects from a queue
		- Using cursors
		- Using ECHO ids
- Objects inside a queue can be garbage-collected
	- Queues can be configured with expiration time for their items.
		- [RB]: Ideally messages also (note: CF KV store has automatic expiration for records: could use to track set of queues?)
- Objects in the queue are mutable
	- We use lamport timestamps for versioning.
		- [RB]: Might be simpler to make it just immutable and track monotonic versions. I.e., message itself is immutable.
- ## Implementation
- One durable object per queues space
	- [RB]: Meaning 1 DO for all queues for a given space? Why do queses need a DO?
- Using sqlite for DOs as this seems to be the direction cloudflare is moving towards
- Schema
	- `queue-entries`
		- ```sql
		  CREATE TABLE queue_entries (
		  	-- auto-incremented key used for range queries
		  	id INTEGER AUTOINCREMENT PRIMARY KEY,
		  	version TEXT, -- Reserved for the lamport clock of the object version, NULL for now
		  	object_id TEXT, -- ECHO object id of each object
		  	queue_id TEXT,
		  	type_dxn TEXT, -- Extracted from echo object for faster lookup -- [RB]: schema_dxn?
		  	created_ts INTEGER, -- Unix timestap of the creation time
		  	updated_ts INTEGER, -- Unix timestap of the update time
		  
		  	data TEXT, -- Object data in JSON format
		  	
		  	INDEX idx_range (queue_id, id), -- For efficient range queries.
		  		- [RB]: Do we need an index for TS range queries?
		  	UNIQUE INDEX idx_object_id (queue_id, object_id), -- Ensures that queue don't have duplicate object ids.
		  		- [RB]: Is the DXN of an object: space-queue-object?
		  );
		  ```
- Notes[RB]
	- Retrofit to AI service.