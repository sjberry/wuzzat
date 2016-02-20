'use strict';

const frameStream = require('frame-stream');


class Connection {
	constructor(socket) {
		let outbound = new frameStream.Encoder();

		outbound.pipe(socket);

		Object.defineProperties(this, {
			address: {
				enumerable: true,
				value: socket.remoteAddress
			},

			port: {
				enumerable: true,
				value: socket.remotePort
			},

			write: {
				enumerable: true,
				value: function(data) {
					if (socket.writable && data != null) {
						outbound.write(data);
					}
				}
			},

			disconnect: {
				enumerable: true,
				value: function() {
					outbound.unpipe(socket);
					socket.destroy();
					//socket.unref();
				}
			}
		});
	}
}


module.exports = Connection;
