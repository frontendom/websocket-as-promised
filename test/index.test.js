'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const W3CWebSocket = require('websocket').w3cwebsocket;
const WebSocketAsPromised = require('../src');
const server = require('./server');

chai.use(chaiAsPromised);
const assert = chai.assert;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('WebSocketAsPromised', function () {

  before(function (done) {
    server.start(url => {
      this.url = url;
      done();
    });
  });

  after(function (done) {
    server.stop(() => done());
  });

  beforeEach(function () {
    this.wsp = new WebSocketAsPromised({WebSocket: W3CWebSocket});
  });

  afterEach(function () {
    if (this.wsp.ws) {
      return this.wsp.close();
    }
  });

  it('should open connection', function () {
    const res = this.wsp.open(this.url);
    return assert.eventually.propertyVal(res, 'type', 'open');
  });

  it('should send and receive data with id', function () {
    const res = this.wsp.open(this.url).then(() => this.wsp.send({foo: 'bar'}));
    return Promise.all([
      assert.eventually.propertyVal(res, 'foo', 'bar'),
      assert.eventually.property(res, 'id')
    ]);
  });

  it('should not resolve/reject for response without ID', function () {
    let a = 0;
    const res = this.wsp.open(this.url)
      .then(() => {
        this.wsp.send({noId: true}).then(() => a = a + 1, () => {});
        return sleep(100).then(() => a);
      });
    return assert.eventually.equal(res, 0);
  });

  it('should close connection', function () {
    const CLOSE_NORMAL = 1000;
    const res = this.wsp.open(this.url).then(() => this.wsp.close());
    return assert.eventually.propertyVal(res, 'code', CLOSE_NORMAL);
  });

  it('should reject all pending requests on close', function () {
    let a = '';
    const res = this.wsp.open(this.url)
      .then(() => {
         this.wsp.send({noId: true}).catch(e => a = e.message);
         return sleep(10).then(() => this.wsp.close()).then(() => a);
      });
    return assert.eventually.equal(res, 'Connection closed.');
  });

  it('should reject for invalid url', function () {
    const res = this.wsp.open('abc');
    return assert.isRejected(res, 'You must specify a full WebSocket URL, including protocol.');
  });

  it('should customize idProp', function () {
    this.wsp = new WebSocketAsPromised({WebSocket: W3CWebSocket, idProp: 'myId'});
    const res = this.wsp.open(this.url).then(() => this.wsp.send({foo: 'bar'}));
    return Promise.all([
      assert.eventually.propertyVal(res, 'foo', 'bar'),
      assert.eventually.property(res, 'myId'),
    ]);
  });
});
