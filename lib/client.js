'use strict';

var EventEmitter = require('events').EventEmitter;
var net = require('net');
var url = require('url');

var Promise = require('bluebird').Promise;
var split = require('binary-split');

var TerminationStream = require('./streams/termination');


const symDisconnected = Symbol('disconnected');
const sockets = new WeakMap();
const delimiter = new Buffer([0xff]);


class Client extends EventEmitter {
	constructor(address, options) {
		var baseDeserialize, baseSerialize, serializer, self;

		super();

		self = this;
		address = url.parse(address);
		options = options || {};

		serializer = options.serializer || require('./serializers/json');
		baseSerialize = Promise.method(serializer.serialize);
		baseDeserialize = Promise.method(serializer.deserialize);

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
				value: new TerminationStream({
					highWaterMark: options.bufferSize || 16000
				})
			}
		});

		this.stream.cork();

		this.on('connected', function() {
			var socket, stream, self = this;

			socket = sockets.get(this);
			stream = socket.pipe(split(delimiter));

			this.stream.pipe(socket);
			this.stream.uncork();

			stream.on('data', function(data) {
				self.deserialize(data)
					.then(function(message) {
						self.emit('data', message);
					})
					.catch(function(err) {
						self.emit('error', err);
					});
			});

			socket.on('close', function(err) {
				self.emit('disconnected', err || null, true);
			});

			this[symDisconnected] = false;
		});

		this.on('disconnected', function(err) {
			var socket;

			socket = sockets.get(this);

			// FIXME: Node bug, calling .cork() on a corked stream clears the internal buffer.
			if (!this.stream._writableState.corked) {
				this.stream.cork();
			}

			this.stream.unpipe(socket);
			socket.destroy();
			sockets.delete(this);

			this[symDisconnected] = true;
		});

		if (options.hasOwnProperty('autoReconnect')) {
			let interval = options.autoReconnect;
			let reconnect = function() {
				setTimeout(function() {
					self.connect.call(self);
				}, interval);
			};

			this.on('disconnected', reconnect);
		}

		if (options.autoConnect !== false) {
			this.connect();
		}
	}

	connect() {
		var self = this;

		if (this.disconnected) {
			let socket = net.createConnection(this.port, this.hostname);

			sockets.set(this, socket);

			socket.on('connect', function() {
				self.emit('connected');
			});

			socket.on('error', function(err) {
				self.emit('disconnected', err, false);
			});
		}
	}

	send(obj) {
		var self = this;

		this.serialize(obj)
			.then(function(data) {
				self.stream.write(data);
			})
			.catch(function(err) {
				self.emit('error', err);
			});
	}
}

Object.defineProperties(Client.prototype, {
	disconnected: {
		enumerable: true,
		get: function() {
			return this.hasOwnProperty(symDisconnected) ? this[symDisconnected] : true;
		}
	}
});


module.exports = Client;
