.PHONY: all
all: mesh-signal-multi-host-join.svg

plantuml-1.2022.6.jar:
	wget https://github.com/plantuml/plantuml/releases/download/v1.2022.6/plantuml-1.2022.6.jar

%.svg: %.puml plantuml-1.2022.6.jar
	java -jar plantuml-1.2022.6.jar -tsvg $<
