'use strict';

var stream = require('stream');


const delimiter = new Buffer([0xff]);


class TerminationStream extends stream.Transform {
	constructor(options) {
		super(options);
	}

	_transform(chunk, enc, cb) {
		this.push(chunk);
		this.push(delimiter);

		cb();
	}
}


module.exports = TerminationStream;
