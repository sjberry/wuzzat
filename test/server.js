'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const expect = require('chai').expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const wuzzat = require('../main');


chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Server', function() {
	var server;

	beforeEach(function() {
		server = new wuzzat.Server('tcp://localhost:5666');
	});

	afterEach(function(done) {
		server.stop().then(done);
	});

	it('should construct Server instances', function() {
		expect(server).to.be.an.instanceof(wuzzat.Server);
	});

	it('should parse address protocols and convert to uppercase', function() {
		expect(server.protocol).to.equal('TCP');
	});

	it('should parse address hostnames', function() {
		expect(server.hostname).to.equal('localhost');
	});

	it('should parse address ports', function() {
		expect(server.port).to.equal(5666);
	});

	it('should set a readonly protocol property', function() {
		expect(function() {
			server.protocol = 'WS';
		}).to.throw(TypeError);
	});

	it('should set a readonly hostname property', function() {
		expect(function() {
			server.hostname = 'example.com';
		}).to.throw(TypeError);
	});

	it('should set a readonly port property', function() {
		expect(function() {
			server.port = 5678;
		}).to.throw(TypeError);
	});

	it('should set a readonly listener property', function() {
		expect(function() {
			server.listener = null;
		}).to.throw(TypeError);
	});

	describe('Methods', function() {
		describe('start', function() {
			it('should return a Promise that resolves if running on an open port', function() {
				let promise = server.start();

				return expect(promise).to.be.fulfilled;
			});

			it('should return a Promise that resolves if starting again on the same port', function() {
				let promise = server.start()
					.then(function() {
						return server.start()
					});

				return expect(promise).to.be.fulfilled;
			});

			it('should return a Promise that rejects if running on a claimed port', function() {
				let promise = server.start().then(function() {
					let conflictingServer = new wuzzat.Server('tcp://localhost:5666');

					return conflictingServer.start();
				});

				return expect(promise).to.be.rejected;
			});
		});

		describe('stop', function() {
			it('should return a Promise that resolves if a stopped server is shut down', function() {
				return expect(server.stop()).to.be.fulfilled;
			});

			it('should return a Promise that resolves if a started server is shut down', function() {
				let promise = server.start()
					.then(function() {
						return server.stop();
					});

				return expect(promise).to.be.fulfilled;
			});

			it('should disconnect all connected clients', function() {
				let client1 = new wuzzat.Client('tcp://localhost:5666', {
					autoConnect: false
				});

				let client2 = new wuzzat.Client('tcp://localhost:5666', {
					autoConnect: false
				});

				let promise = server.start()
					.then(function() {
						return Promise.all([
							new Promise(function(resolve) {
								client1.connect();
								client1.once('connected', resolve);
							}),
							new Promise(function(resolve) {
								client2.connect();
								client2.once('connected', resolve);
							})
						]);
					})
					.then(function() {
						return server.stop();
					})
					.then(function() {
						return new Promise(function(resolve, reject) {
							server.listener.getConnections(function(err, count) {
								if (err) {
									reject(err);
								}
								else {
									resolve(count);
								}
							});
						})
					});

				return expect(promise).to.eventually.equal(0);
			});
		});
	});

	describe('Events', function() {
		describe('connection', function() {
			it('should fire the `connection` event when a client connects', function() {
				let spy = sinon.spy();
				let client = new wuzzat.Client('tcp://localhost:5666', {
					autoConnect: false
				});

				server.on('connection', spy);

				let promise = new Promise(function(resolve, reject) {
					server.on('connection', resolve);

					server.start()
						.then(function() {
							client.connect();
						});
				}).then(function() {
					return expect(spy).to.have.been.calledOnce;
				});

				return expect(promise).to.be.fulfilled;
			});
		});

		describe('data', function() {
			it('should fire the `data` event with received data when receiving data from a client', function() {
				let message = new Buffer([0xff, 0xff]);
				let spy = sinon.spy();
				let matcher = sinon.match(function(value) {
					return value.equals(message);
				});

				let client = new wuzzat.Client('tcp://localhost:5666', {
					autoConnect: false
				});

				server.on('data', spy);

				let promise = server.start()
					.then(function() {
						return new Promise(function(resolve) {
							client.on('connected', resolve);
							client.connect();
						});
					})
					.then(function() {
						return new Promise(function(resolve) {
							server.on('data', resolve);
							client.write(message);
						});
					})
					.then(function() {
						return expect(spy).to.have.been.calledWith(matcher);
					});

				return expect(promise).to.be.fulfilled;
			});
		});

		describe('disconnection', function() {
			it('should fire the `disconnection` event when disconnecting a client', function() {
				let spy = sinon.spy();

				let client = new wuzzat.Client('tcp://localhost:5666', {
					autoConnect: false
				});

				server.on('disconnection', spy);

				let promise = new Promise(function(resolve) {
					server.on('disconnection', resolve);

					server.on('connection', function(connection) {
						connection.disconnect();
					});

					server.start()
						.then(function() {
							client.connect();
						});
				}).then(function() {
					return expect(spy).to.have.been.calledOnce;
				});

				return expect(promise).to.be.fulfilled;
			});

			it('should fire the `disconnection` event when a client disconnects');
		});

		describe('stopped', function() {
			it('should fire the `stopped` event after successfully shutting down', function() {
				let spy = sinon.spy();

				server.on('stopped', spy);

				let promise = server.start()
					.then(function() {
						return server.stop();
					})
					.then(function() {
						return expect(spy).to.have.been.calledOnce;
					});

				return expect(promise).to.be.fulfilled;
			});

			it('should fire the `stopped` event after successfully shutting down a stopped server', function() {
				let spy = sinon.spy();

				server.on('stopped', spy);

				let promise = server.stop()
					.then(function() {
						return expect(spy).to.have.been.calledOnce;
					});

				return expect(promise).to.be.fulfilled;
			});
		});

		describe('started', function() {
			it('should fire the `started` event after successfully starting', function() {
				let spy = sinon.spy();

				server.on('started', spy);

				let promise = server.start().then(function() {
					return expect(spy).to.have.been.calledOnce;
				});

				return expect(promise).to.be.fulfilled;
			});

			it('should fire the `started` event after successfully starting a started server', function() {
				let spy = sinon.spy();

				server.on('started', spy);

				let promise = server.start()
					.then(function() {
						return server.start();
					})
					.then(function() {
						return expect(spy).to.have.been.calledTwice;
					});

				return expect(promise).to.be.fulfilled;
			});
		});
	});
});
