module.exports = {
	Client: require('./lib/client'),
	Connection: require('./lib/connection'),
	Server: require('./lib/server'),

	serializers: {
		json: require('./lib/serializers/json'),
		msgpack: require('./lib/serializers/msgpack')
	}
};
