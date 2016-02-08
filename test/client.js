var Log = require('log');

var Client = require('../lib/client');


var logger = new Log();
var client = new Client('tcp://localhost:5666', {
	autoReconnect: 1000,
	autoConnect: false,
	bufferSize: 5000000, // bytes
	serializer: require('../lib/serializers/msgpack')
});

client.send({
	method: 'pants',
	params: [1, 2, 3, 4]
});

client.on('connected', function() {
	logger.debug(this.protocol + ' connection established with ' + this.hostname + ':' + this.port + '.');
});

client.on('disconnected', function(err, established) {
	if (established) {
		logger.debug('Connection with ' + this.hostname + ':' + this.port + ' lost.');
	}
	else {
		logger.debug('Connection with ' + this.hostname + ':' + this.port + ' failed.');
	}
});

client.on('data', function(data) {
	console.log(data);
});

client.connect();
