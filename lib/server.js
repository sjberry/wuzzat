'use strict';

const EventEmitter = require('events').EventEmitter;
const net = require('net');
const url = require('url');

const frameStream = require('frame-stream');

const Connection = require('./connection');


const booted = Symbol('booted');


class Server extends EventEmitter {
	constructor(address, options) {
		super();

		let self = this;
		address = url.parse(address);
		options = options || {};

		let listener = net.createServer(function(socket) {
			let connection = new Connection(socket);
			let inbound = new frameStream.Decoder();

			socket.pipe(inbound);

			inbound.on('data', function(data) {
				self.emit('data', data, connection);
			});

			socket.on('error', function(err) {
				self.emit('error', err, connection);
			});

			socket.once('end', function() {
				self.emit('disconnection', connection);
			});

			self.emit('connection', connection);
		});

		Object.defineProperties(this, {
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
			}
		});
	}

	run() {
		let self = this;

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
