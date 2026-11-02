# Saas2D: the narrative

The story told in full, with no time limit, as a lecture on the business dynamics: what SaaS did, what that led to and
why, why AI breaks it, and what the alternative is. Nobody in it acts badly; every consequence follows from the
architecture. The three two-minute cuts at the end are each written from this text and keep its three acts. Brief,
fact sheet and critiques: `agents/superpowers/specs/saas2d-voiceover.md`.

## The full story

### The first revolution

Software as a service revolutionized the software industry. The important thing it changed was the economics. One
vendor runs one codebase for millions of customers, so the cost of every feature, every fix and every server is spread
across all of them, and a company can adopt a product in an afternoon instead of a procurement cycle. Buyers gained
speed and vendors gained scale, and nothing visible was lost. That is why it won everywhere.

Two consequences followed from that economics, and both were structural rather than anyone's intent.

The first is specialization. A vendor serving millions wins by being the best at one job, so the market organized
itself around best-of-breed products, each excellent at its slice: one for customer records, one for conversations, one
for documents, one for tickets, one for code, one for plans. A company assembles its operation from dozens of them, a
large company from hundreds. Each product must hold the data for its job in order to do that job, so the company's data
is partitioned by vendor, in each vendor's shape, behind each vendor's API. Integration is left to the buyer. It is
never any vendor's core product, so it is always a step behind, and in practice people are the integration layer: the
person who copies the figure across, who knows which system holds the answer, who keeps the spreadsheet that joins what
the tools do not. The words for this condition are silos and fragmentation.

The second is lock-in, and it is a consequence of the architecture rather than a strategy. The data accumulates inside
the product in the product's own shape, and the cost of leaving grows with every day of use, because leaving means
leaving the history behind. A vendor's position is defended not by its features, which competitors can copy, but by
the data it holds, which they cannot. The data is held captive by the design, and the design was chosen for good
reasons.

That is the equilibrium the industry reached: dozens of silos, each individually excellent, collectively fragmented,
with a company's complete picture of itself existing nowhere. For as long as the user of software was a person, this
was a cost worth paying.

### The second revolution

The driver of change is AI, and specifically agents, and the architecture above is the wrong one for them.

A SaaS product is built around a person in a session: a user interface, a login, a permission model about who may
click what. The API is a secondary surface added so that other products can be bolted on. An agent is not a user of a
product. It is a worker on a job, and a job cuts across products. To decide whether to escalate a ticket, an agent
needs the ticket, the customer's record, the contract, the conversation last week and the engineer's plan for the fix,
in a single step of reasoning. The value an agent produces is in those joins, and the joins are exactly what no vendor
holds, because each holds only its own slice. Agents need access to everything to realize their full potential, and
under this architecture, everything is in dozens of places, each with its own API, its own permission model and its
own rate limit, and whatever the agent produces lands back in one of the silos. Each vendor's answer, an assistant of
its own inside its own product, reproduces the fragmentation one level up: a dozen agents, each seeing a twelfth.

It will get worse before it gets better, because AI is the second revolution, and it is as complete as the first. SaaS
displaced installed software by changing who ran it. Agents displace the application itself by changing who uses it.
When the work is done by an agent, the interface a vendor spent a decade refining is no longer the point; the data and
the model are. Every SaaS vendor is exposed, and the organizations positioned to replace them are the few that can
train frontier models, because that is a game very few can afford to play. Each of them is building a platform rather
than a model: the model, the agents, their tools, their memory and the surfaces people reach them through, so that a
company's work can move inside. For a company this looks like the cure for fragmentation, and it is, by consolidation:
all of the data, all of the agents and all of the reasoning with one vendor whose model, prices and roadmap the company
does not control. That is a deeper lock-in than SaaS ever produced, and companies are walking into it for the same
reason they walked into the last one.

### The alternative

There is an alternative, and it rests on an inversion of control. Under SaaS the application owns the data and the
company reaches in. Invert it: the company owns the data, and applications and agents reach in. That is a simple
sentence and a hard architecture, because the thing at the centre has to be a database of an unusual kind.

It has to be distributed, with copies on every device and at the edge, so nothing depends on a single vendor's
servers. It has to be a graph, with relations as first-class data, so that the joins an agent needs live in the data
rather than in integration code. It has to be typed, so that people, apps and agents agree on what an object means. It
has to carry permissions in the data itself, so that access is a property of the object and not a setting in each app.
And it has to treat an agent as a member, with an identity of its own, reading and writing the same objects as the
people and reacting when they change, rather than as an external caller of an API.

ECHO is that database: a distributed graph database, and the first built for agents from the start rather than opened
to them afterwards. Its objects are typed and related; its unit of access is the space, which is also its unit of
replication, so who can see what travels with the data; it is local-first, so every copy works offline and reconciles
on reconnection; and an agent holds a HALO identity and joins a space like any other member. It replicates peer to
peer and through EDGE, which runs on Cloudflare Workers and Durable Objects with R2 for storage and Workers AI for
inference.

Composer is what runs on it: the first enterprise superapp, an extensible framework for building agent-assisted
applications. Documents, mail, tasks, meetings and the agents that work on them are plugins over one graph. An agent
in a space sees the same objects the people see and writes its results back where the next person or agent picks them
up. Models plug in underneath and are interchangeable; the agent's identity, memory and permissions live in the space,
so changing the model moves nothing else.

The result is the inversion made concrete. The silos collapse into one graph. Agents get access to everything, because
everything is in one place and the permissions travel with it. The frontier labs become suppliers of a component rather
than landlords of the business. Control returns to the company, and with it the freedom to build whatever it wants on
its own data.

This is DXOS. Your team. Your apps. Your data.

## Two-minute cuts

Budget: about 190 words before the fixed close, at Watson speed 1.08 with the scene floors in
`voice/fit_saas2d.py`. Each cut keeps the three acts; they differ in where the weight falls.

### Cut 1: the economics

Software as a service revolutionized the software industry. One codebase serving millions spread the cost of every
feature across every customer, and a company could adopt a product in an afternoon.

Two things followed from that economics. Vendors specialized, so a company now assembles itself from dozens of
products, each holding the data for its own job in its own shape. And data accumulates where it is created, so leaving
means leaving the history behind. Silos, fragmentation and lock-in: consequences of the architecture.

Agents break this architecture. An agent works a job, and a job cuts across products. Its value is in the joins, and
no vendor holds the joins. Agents need access to everything.

It gets worse. Agents displace the application itself, and the few labs that can train frontier models are building
platforms to take the work in whole. Consolidation cures fragmentation with a deeper lock-in.

The alternative is an inversion of control: the company owns the data; apps and agents reach in. ECHO makes it
possible: a distributed graph database, typed, permissioned in the data, agent-native, on Cloudflare. Composer is the enterprise superapp built on it.

This is DXOS. Your team. Your apps. Your data.

### Cut 2: the joins

Software as a service revolutionized the software industry, and it did so by specializing: one vendor, one job,
millions of customers. A company now runs on dozens of these products, each holding the data for its job in its own shape.
While the user of software was a person, that was a cost worth paying. People were the integration layer.

An agent is not a user of a product. It works a job, and a job cuts across products: the ticket, the customer, the
contract, last week's conversation, in one step of reasoning. The value is in the joins, and no vendor
holds the joins. Agents need access to everything to realize their full potential.

And agents displace the application itself. The few labs that can train frontier models are building platforms to take
the work in whole: a single, deeper dependence.

The alternative inverts control. The company owns the data; applications and agents reach in. ECHO is the agent-native
graph database at the centre, distributed across every device and Cloudflare, permissions and agent identity carried in
the data. Composer is the enterprise superapp on top: documents, mail, tasks and agents over
one graph.

This is DXOS. Your team. Your apps. Your data.

### Cut 3: the inversion

Software as a service revolutionized the software industry by putting the application at the centre: the vendor runs
it, the company reaches in. Specialization followed, so a company's data is partitioned across dozens of vendors, each in
its own shape, and the cost of leaving grows with every day of use. Silos, fragmentation, lock-in: consequences
of the architecture.

That architecture fails for agents. An agent works a job that cuts across products, and its value is in the joins no
vendor holds. Agents need access to everything. And the few labs able to train frontier models are offering to hold
everything, which cures fragmentation with a deeper dependence.

Invert the architecture. The company owns the data; applications and agents reach in. That takes a new kind of
database: distributed, on every device and at the edge; a graph, so the joins live in the data; typed; permissioned in
the object itself; agent-native, with agents as members with identities of their own. ECHO is
that database, and it runs on Cloudflare: Workers, Durable Objects, R2, Workers AI. Composer is
the enterprise superapp built on it, an extensible framework for agent-assisted applications.

This is DXOS. Your team. Your apps. Your data.
