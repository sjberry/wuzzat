var msgpack = require('msgpack');


function deserialize(data) {
	return msgpack.unpack(data);
}


function serialize(object) {
	return msgpack.pack(object);
}


module.exports = {
	deserialize: deserialize,
	serialize: serialize
};
