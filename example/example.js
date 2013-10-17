var express = require('express')
var DiscoverProxy = require('../')

var app = express()

app.use('/discover', new DiscoverProxy())

app.use(function(req, res) {
	res.send(200,
		'visit /disover?entity=https://yourentity.yourserver.com to get going')
})

var port = 5000
app.listen(port)
console.log('app listens on :%s', port)