function deserialize(data) {
	return JSON.parse(data);
}


function serialize(object) {
	return JSON.stringify(object);
}


module.exports = {
	deserialize: deserialize,
	serialize: serialize
};
