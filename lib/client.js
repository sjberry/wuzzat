'use strict';

const EventEmitter = require('events').EventEmitter;
const net = require('net');
const stream = require('stream');
const url = require('url');

const frameStream = require('frame-stream');


const symDisconnected = Symbol('disconnected');
const sockets = new WeakMap();


class Client extends EventEmitter {
	constructor(address, options) {
		super();

		let self = this;
		address = url.parse(address);
		options = options || {};

		let buffer = new stream.PassThrough({
			highWaterMark: options.bufferSize || 1000 // bytes
		});

		let outbound = new frameStream.Encoder();

		Object.defineProperties(this, {
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

			stream: {
				enumerable: true,
				value: outbound
			}
		});

		outbound.pipe(buffer);
		buffer.cork();

		this.on('connected', function() {
			let self = this;

			let socket = sockets.get(this);
			let inbound = new frameStream.Decoder();

			socket.pipe(inbound);
			buffer.pipe(socket);
			buffer.uncork();

			inbound.on('data', function(data) {
				self.emit('data', data);
			});

			socket.on('error', function(err) {
				self.emit('error', err);
			});

			socket.once('close', function(err) {
				self.emit('disconnected', err || null, true);
			});

			this[symDisconnected] = false;
		});

		this.on('disconnected', function(err) {
			let socket = sockets.get(this);

			// FIXME: Node bug, calling .cork() on a corked stream clears the internal buffer.
			if (!buffer._writableState.corked) {
				buffer.cork();
			}

			buffer.unpipe(socket);
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
		let self = this;

		if (this.disconnected) {
			let socket = net.createConnection(this.port, this.hostname);

			sockets.set(this, socket);

			socket.once('connect', function() {
				self.emit('connected');
			});

			socket.once('error', function(err) {
				self.emit('disconnected', err, false);
			});
		}
	}

	write(data) {
		if (data != null) {
			this.stream.write(data);
		}
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
