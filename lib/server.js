'use strict';

const EventEmitter = require('events').EventEmitter;
const net = require('net');
const url = require('url');

const frameStream = require('frame-stream');

const Connection = require('./connection');


class Server extends EventEmitter {
	constructor(address, options) {
		super();

		let self = this;
		address = url.parse(address);
		options = options || {};

		let listener = net.createServer(function(socket) {
			let connection = new Connection(socket);
			let inbound = new frameStream.Decoder();

			self.connections.push(connection);
			socket.pipe(inbound);

			inbound.on('data', function(data) {
				self.emit('data', data, connection);
			});

			socket.on('error', function(err) {
				self.emit('error', err, connection);
			});

			socket.once('end', function() {
				let index = self.connections.indexOf(connection);

				if (index >= 0) {
					self.connections.splice(index, 1);
				}

				connection.disconnect();
			});

			socket.once('close', function() {
				self.emit('disconnection', connection);
			});

			self.emit('connection', connection);
		});

		Object.defineProperties(this, {
			connections: {
				enumerable: true,
				value: []
			},

			hostname: {
				enumerable: true,
				value: address.hostname
			},

			listener: {
				enumerable: true,
				value: listener
			},

			port: {
				enumerable: true,
				value: parseInt(address.port)
			},

			protocol: {
				enumerable: true,
				value: address.protocol.slice(0, -1).toUpperCase()
			}
		});
	}

	/**
	 * Starts the server on the specified hostname and port.
	 *
	 * @returns {Promise} A promise that is resolved when the server successfully starts.
	 */
	start() {
		let self = this;

		this.listener.listen(this.port, this.hostname);

		return new Promise(function(resolve, reject) {
			// FIXME: Memory leak issue when spamming .start().

			self.listener.once('listening', function() {
				resolve();
				self.emit('started');
			});

			self.listener.once('error', function(err) {
				reject(err);
			});
		});
	}

	/**
	 * Stops the server and closes all connections.
	 *
	 * @returns {Promise}
	 */
	stop() {
		let self = this;

		return new Promise(function(resolve, reject) {
			// FIXME: Memory leak issue when spamming .stop().

			for (let i = 0; i < self.connections.length; i++) {
				let connection = self.connections[i];

				connection.disconnect();
			}

			self.connections.length = 0;

			self.listener.once('close', function() {
				resolve();
				self.emit('stopped');
			});

			self.listener.close(reject);
		});
	}
}


module.exports = Server;
