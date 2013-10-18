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
	opts.allowForce || (opts.allowForce = true)

	function proxy(req, res) {
		if(!req.query.entity || !isUrl(req.query.entity))
			return res.json(400,
				{ error: 'missing / invalid entity query parameter' })

		var store = Store[req.query.entity] // already in cache?
		if(!store || (opts.allowForce && req.query.force)) requestMeta()
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
						setNewTimeout()
					}
					res.json(200, meta)
				}
			})
		}

		function validateCache() {
			var cacheReq = hyperquest.get(store.url)
			cacheReq.setHeader('If-None-Match', store.etag)

			cacheReq.on('error', onError)

			var response
			cacheReq.on('response', function(resp) {
				response = resp
				if(resp.statusCode === 304) {
					store.ts = Math.floor(Date.now() / 1000)
					setNewTimeout()
					res.json(200, store.meta)
				}
			})

			cacheReq.pipe(concat(function(body) {
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

		function setNewTimeout() {
			var store = Store[req.query.entity]
			if(store.timeout) clearTimeout(store.timeout)
			store.timeout = setTimeout(function() {
				console.log('delete!')
				delete Store[req.query.entity]
			}, opts.cacheDuration * 1000)
		}
	}

	return proxy
}