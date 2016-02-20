const Log = require('log');

const Server = require('../lib/server');


const logger = new Log();
const server = new Server('tcp://localhost:5666');

server.on('data', function(data, connection) {
	logger.debug('Data received', data);

	connection.write(data);
});

server.on('error', function(err) {
	logger.error(err);
});

server.on('connection', function(connection) {
	logger.info('Client connected from ' + connection.address + ':' + connection.port + '.');
});

server.on('disconnection', function(connection) {
	logger.info('Client disconnected from ' + connection.address + ':' + connection.port + '.');
});

server.once('started', function() {
	logger.info(this.protocol + ' server listening on ' + this.hostname + ':' + this.port + '.');
});


server.start()
	.catch(function(err) {
		server.logger.error(err);
		process.exit(1);
	});
