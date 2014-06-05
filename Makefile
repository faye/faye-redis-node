prepare:
	git submodule update --init --recursive
	cd vendor/faye && npm install
	cd vendor/faye && ./node_modules/.bin/wake
	npm install
