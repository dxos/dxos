# @dxos/pipeline

Generic, back-pressured streaming pipeline. A pipeline runs an Effect `Stream` source through an
ordered chain of stages — each a `Stream → Stream` transform sharing one injected context — and
drains the result to a sink. Back pressure is the default (pull-based `Stream`) and configurable
per pipeline or per stage (`suspend` / `sliding` / `dropping`).
