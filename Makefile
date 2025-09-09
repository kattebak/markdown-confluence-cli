DOCUMENTATION_TARGETS=$(addprefix build/doc/,$(wildcard *.md))

test: clean $(DOCUMENTATION_TARGETS)

clean:
	rm -rf build

build/doc/%.md: %.md
	@echo "$< ==> $@"
	mkdir -p $(dir $@)
	npx @mermaid-js/mermaid-cli -i "$<" -o "$@" -e png
	npx @kattebak/markdown-confluence-cli sync sync -f $@ -u $$CONFLUENCE_USER -t $$CONFLUENCE_TOKEN -d $$CONFLUENCE_DOMAIN -i $$CONFLUENCE_SPACE_ID

