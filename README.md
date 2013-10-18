# tent-discover-proxy
Simple [express](http://expressjs.com/) middleware which proxies [Tent](https://tent.io) discover requests. This allows browser apps to bypass CORS limitations.
Has basic built-in cache functionality to speed up further requests.

## install
With npm:
	
	npm install tent-discover-proxy

## usage
	var express = require('express')
	var DiscoverProxy = require('tent-discover-proxy')

	var app = express()

	app.use('/discover', new DiscoverProxy({ // options; all optional
		cacheDuration: 60 * 60 * 24, // number of seconds to hold each cache record in memory
		allowForce: true // allow to pass ?force=true to circumvent the cache
	}))
	
	app.use('*', sendClientApp())

	app.listen(8000)

All requests to `/discover?entity=tent.example.com` will now return the corresponding meta post or a JSON error object. If the Tent server returns an etag header, the meta post will be hold in memory and subsequent discover requests will trigger an `If-None-Match` check.

## new DiscoverProxy(opts)
Returns the middleware. `opts` is optional.

## license
MIT