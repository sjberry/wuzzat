'use strict';

var EventEmitter = require('events').EventEmitter;
var net = require('net');
var stream = require('stream');
var url = require('url');

var Promise = require('bluebird').Promise;
var split = require('binary-split');

var Connection = require('./connection');


const booted = Symbol('booted');
const delimiter = new Buffer([0xff]);


class Server extends EventEmitter {
	constructor(address, options) {
		var baseDeserialize, baseSerialize, listener, serializer, self;

		super();

		self = this;
		address = url.parse(address);
		options = options || {};

		serializer = options.serializer || require('./serializers/json');
		baseSerialize = Promise.method(serializer.serialize);
		baseDeserialize = Promise.method(serializer.deserialize);

		listener = net.createServer(function(socket) {
			var connection, stream;

			connection = new Connection(socket);
			stream = socket.pipe(split(delimiter));

			stream.on('data', function(data) {
				self.deserialize(data)
					.then(function(message) {
						self.emit('data', message, connection);
					})
					.catch(function(err) {
						self.emit('error', err, connection);
					});
			});

			socket.on('end', function() {
				self.emit('disconnect', connection);
			});

			self.emit('connect', connection);
		});

		Object.defineProperties(this, {
			deserialize: {
				enumerable: true,
				value: function(data) {
					return new Promise(function(resolve, reject) {
						baseDeserialize(data)
							.then(function(object) {
								resolve(object);
							})
							.catch(function(err) {
								reject(err);
							});
					});
				}
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
				value: address.port
			},

			protocol: {
				enumerable: true,
				value: address.protocol.slice(0, -1).toUpperCase()
			},

			serialize: {
				enumerable: true,
				value: function(object) {
					if (object == null) {
						return Promise.resolve(null);
					}

					return baseSerialize(object);
				}
			},

			stream: {
				enumerable: true,
				value: new stream.PassThrough()
			}
		});
	}

	send(obj, channel, options) {
		this.serialize(obj)
			.then(function(data) {
				channel.write(data, options);
			})
			.catch(function(err) {
				self.emit(error, err);
			});
	}

	run() {
		var self = this;

		if (this.hasOwnProperty(booted)) {
			return this[booted];
		}

		this.listener.listen(this.port, this.hostname);

		return this[booted] = new Promise(function(resolve, reject) {
			self.listener.once('listening', function() {
				resolve();
				self.emit('listening');
			});

			self.listener.once('error', function(err) {
				reject(err);
			});
		});
	}
}


module.exports = Server;
