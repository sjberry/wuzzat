const Log = require('log');

const Client = require('../lib/client');


const logger = new Log();
const client = new Client('tcp://localhost:5666', {
	autoReconnect: 1000,
	autoConnect: false,
	bufferSize: 5000000 // bytes
});

client.write(new Buffer([0x7a]));
client.write(new Buffer([0x7b]));
client.write(new Buffer([0x7c]));

client.on('data', function(data) {
	logger.debug('Data received', data);
});

client.on('error', function(err) {
	logger.error(err);
});

client.on('connected', function() {
	logger.info(this.protocol + ' connection established with ' + this.hostname + ':' + this.port + '.');
});

client.on('disconnected', function(err, established) {
	if (established) {
		logger.info('Connection with ' + this.hostname + ':' + this.port + ' lost.');
	}
	else {
		logger.info('Connection with ' + this.hostname + ':' + this.port + ' failed.');
	}
});

client.connect();
