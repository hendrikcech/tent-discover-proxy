var discover = require('tent-discover')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')
var isUrl = require('is-url')

var Store = {}
/*
	entity: {
		ts: Date,
		etag: String,
		url: String,
		meta: Object
	}
*/

module.exports = function(opts) {
	opts || (opts = {})
	opts.cacheDuration || (opts.cacheDuration = 60 * 60 * 24) // 24h

	function proxy(req, res) {
		if(!req.query.entity || !isUrl(req.query.entity))
			return res.json(400,
				{ error: 'missing / invalid entity query parameter' })

		var store = Store[req.query.entity] // already in cache?
		if(!store) requestMeta()
		else validateCache()

		function requestMeta() {
			discover(req.query.entity, function(err, meta, response) {
				if(err) res.json(500, { error: err.toString() })
				else {
					if(response.headers.etag) {
						Store[req.query.entity] = {
							ts: Math.floor(Date.now() / 1000),
							etag: response.headers.etag,
							url: response.url,
							meta: meta
						}
					}
					res.json(200, meta)
				}
			})
		}

		function validateCache() {
			var elapsed = Math.floor(Date.now() / 1000) - store.ts
			if(elapsed > opts.maxDuration) return requestMeta()

			var req = hyperquest.get(store.url)
			req.setHeader('If-None-Match', store.etag)

			req.on('error', onError)

			var response
			req.on('response', function(resp) {
				response = resp
				if(resp.statusCode === 304) {
					store.ts = Math.floor(Date.now() / 1000)
					res.json(200, store.meta)
				}
			})

			req.pipe(concat(function(body) {
				if(response.statusCode === 304) return
				if(response.statusCode !== 200)
					return onError(response.statusCode)

				res.json(200, body)
			}))

			function onError(err) {
				delete Store[req.query.entity]
				res.json(500, { error: err })
			}
		}
	}

	return proxy
}