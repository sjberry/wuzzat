var Log = require('log');

var Server = require('../lib/server');


var logger = new Log();
var server = new Server('tcp://localhost:5666', {
	serializer: require('../lib/serializers/msgpack')
});

server.on('data', function(data, socket) {
	console.log(data);

	this.serialize(data).then(function(data) {
		socket.write(data);
	});
});

server.on('error', function(err) {
	logger.error(err);
});

server.on('connect', function(connection) {
	logger.debug('Client connected from ' + connection.address + ':' + connection.port + '.');
});

server.on('disconnect', function(connection) {
	logger.debug('Client disconnected from ' + connection.address + ':' + connection.port + '.');
});

server.once('listening', function() {
	logger.info(this.protocol + ' server listening on ' + this.hostname + ':' + this.port + '.');
});


server.run()
	.catch(function(err) {
		server.logger.error(err);
		process.exit(1);
	});
