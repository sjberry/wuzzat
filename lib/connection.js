'use strict';

var TerminationStream = require('./streams/termination');


class Connection {
	constructor(socket) {
		var stream;

		stream = new TerminationStream();

		stream.pipe(socket);

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
						stream.write(data);
					}
				}
			}
		});
	}
}


module.exports = Connection;
