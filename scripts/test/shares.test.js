/*
 *
 * Shares (Updated)
 *
 */

const redis = require('redis-mock');
jest.mock('redis', () => jest.requireActual('redis-mock'));

const utils = require('../main/utils');
const PoolLogger = require('../main/logger');
const PoolShares = require('../main/shares');
const poolConfig = require('../../configs/pools/example.js');
const portalConfig = require('../../configs/main/example.js');

const client = redis.createClient({
  'port': portalConfig.redis.port,
  'host': portalConfig.redis.host,
});
client._maxListeners = 0;
client._redisMock._maxListeners = 0;

poolConfig.primary.address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
poolConfig.primary.recipients[0].address = 'tb1qcc0lzt4fftzmpxuye6q8vnfngu03yuwpasu0dw';
const logger = new PoolLogger(portalConfig);

////////////////////////////////////////////////////////////////////////////////

describe('Test shares functionality', () => {

  let poolConfigCopy, configCopy;
  beforeEach((done) => {
    poolConfigCopy = JSON.parse(JSON.stringify(poolConfig));
    configCopy = JSON.parse(JSON.stringify(portalConfig));
    client.flushall(() => done());
  });

  test('Test initialization of shares', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    expect(typeof poolShares.poolConfig).toBe('object');
    expect(typeof poolShares.calculateBlocks).toBe('function');
    expect(typeof poolShares.buildSharesCommands).toBe('function');
  });

  test('Test redis client error handling', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    poolShares.client.emit('error', 'example error');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Redis client had an error'));
    console.log.mockClear();
  });

  test('Test redis client ending handling', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    poolShares.client.emit('end');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching('Connection to redis database has been ended'));
    console.log.mockClear();
  });

  test('Test timing command handling [1]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example': dateNow - 300000 }, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'example'],
      ['hset', 'Pool1:rounds:primary:current:submissions', 'example']];
    const commands = poolShares.buildTimesCommands(results, shareData, true, false);
    expect(commands.length).toBe(2);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(utils.roundTo(commands[0].slice(3)[0])).toBe(300);
    expect(utils.roundTo(commands[1].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000));
  });

  test('Test timing command handling [2]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'example'],
      ['hset', 'Pool1:rounds:primary:current:submissions', 'example']];
    const commands = poolShares.buildTimesCommands(results, shareData, true, false);
    expect(commands.length).toBe(2);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(utils.roundTo(commands[0].slice(3)[0])).toBe(0);
    expect(utils.roundTo(commands[1].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000));
  });

  test('Test timing command handling [3]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example': dateNow - 1000000 }, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [['hset', 'Pool1:rounds:primary:current:submissions', 'example']];
    const commands = poolShares.buildTimesCommands(results, shareData, true, false);
    expect(commands.length).toBe(1);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(utils.roundTo(commands[0].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000));
  });

  test('Test timing command handling [4]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example': dateNow - 300000 }, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'example']];
    const commands = poolShares.buildTimesCommands(results, shareData, true, true);
    expect(commands.length).toBe(1);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(utils.roundTo(commands[0].slice(3)[0])).toBe(300);
  });

  test('Test timing command handling [5]', () => {
    const dateNow = Date.now();
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example1': dateNow - 300000 }, {}, { 'example2': dateNow - 300000 }];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'example1'],
      ['hset', 'Pool1:rounds:primary:current:submissions', 'example1'],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:times', 'example2'],
      ['hset', 'Pool1:rounds:auxiliary:current:submissions', 'example2']];
    const commands = poolShares.buildTimesCommands(results, shareData, true, false);
    expect(commands.length).toBe(4);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(commands[2].slice(0, 3)).toStrictEqual(expected[2]);
    expect(commands[3].slice(0, 3)).toStrictEqual(expected[3]);
    expect(utils.roundTo(commands[0].slice(3)[0])).toBe(300);
    expect(utils.roundTo(commands[2].slice(3)[0])).toBe(300);
    expect(utils.roundTo(commands[1].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000));
    expect(utils.roundTo(commands[3].slice(3)[0] / 1000)).toBe(utils.roundTo(dateNow / 1000));
  });

  test('Test share command handling [1]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example': dateNow - 300000 }, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'example'],
      ['hset', 'Pool1:rounds:primary:current:submissions', 'example'],
      ['zadd', 'Pool1:rounds:primary:current:hashrate'],
      ['hincrby', 'Pool1:rounds:primary:current:counts', 'valid', 1],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares']];
    const commands = poolShares.buildSharesCommands(results, shareData, true, false);
    expect(commands.length).toBe(5);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(commands[2].slice(0, 2)).toStrictEqual(expected[2]);
    expect(commands[3]).toStrictEqual(expected[3]);
    expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
  });

  test('Test share command handling [2]', () => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example': dateNow - 300000 }, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['zadd', 'Pool1:rounds:primary:current:hashrate'],
      ['hincrby', 'Pool1:rounds:primary:current:counts', 'invalid', 1]];
    const commands = poolShares.buildSharesCommands(results, shareData, false, true);
    expect(commands.length).toBe(2);
    expect(commands[0].slice(0, 2)).toStrictEqual(expected[0]);
    expect(commands[1]).toStrictEqual(expected[1]);
  });

  test('Test share command handling [3]', () => {
    const dateNow = Date.now();
    poolConfigCopy.auxiliary = { enabled: 'true' };
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example1': dateNow - 300000 }, {}, { 'example2': dateNow - 300000 }];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example1',
      'addrAuxiliary': 'example2',
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'auxiliary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'example1'],
      ['hset', 'Pool1:rounds:primary:current:submissions', 'example1'],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:times', 'example2'],
      ['hset', 'Pool1:rounds:auxiliary:current:submissions', 'example2'],
      ['zadd', 'Pool1:rounds:primary:current:hashrate'],
      ['hincrby', 'Pool1:rounds:primary:current:counts', 'valid', 1],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares'],
      ['zadd', 'Pool1:rounds:auxiliary:current:hashrate'],
      ['hincrby', 'Pool1:rounds:auxiliary:current:counts', 'valid', 1],
      ['hincrbyfloat', 'Pool1:rounds:auxiliary:current:shares']];
    const commands = poolShares.buildSharesCommands(results, shareData, true, false);
    expect(commands.length).toBe(10);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(commands[2].slice(0, 3)).toStrictEqual(expected[2]);
    expect(commands[3].slice(0, 3)).toStrictEqual(expected[3]);
    expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
    expect(commands[5]).toStrictEqual(expected[5]);
    expect(commands[6].slice(0, 2)).toStrictEqual(expected[6]);
    expect(commands[7].slice(0, 2)).toStrictEqual(expected[7]);
    expect(commands[8]).toStrictEqual(expected[8]);
    expect(commands[9].slice(0, 2)).toStrictEqual(expected[9]);
  });

  test('Test block command handling [1]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['del', 'Pool1:rounds:primary:current:submissions'],
      ['rename', 'Pool1:rounds:primary:current:counts', 'Pool1:rounds:primary:round-1972211:counts'],
      ['rename', 'Pool1:rounds:primary:current:shares', 'Pool1:rounds:primary:round-1972211:shares'],
      ['rename', 'Pool1:rounds:primary:current:times', 'Pool1:rounds:primary:round-1972211:times'],
      ['sadd', 'Pool1:blocks:primary:pending'],
      ['hincrby', 'Pool1:blocks:primary:counts', 'valid', 1]];
    const commands = poolShares.calculateBlocks(results, shareData, true, true);
    expect(commands.length).toBe(6);
    expect(commands[0]).toStrictEqual(expected[0]);
    expect(commands[1]).toStrictEqual(expected[1]);
    expect(commands[2]).toStrictEqual(expected[2]);
    expect(commands[3]).toStrictEqual(expected[3]);
    expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
    expect(commands[5]).toStrictEqual(expected[5]);
  });

  test('Test block command handling [2]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'primary',
      'difficulty': 1,
      'hash': 'example',
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
      'transaction': 'example',
    };
    const expected = [['hincrby', 'Pool1:blocks:primary:counts', 'invalid', 1]];
    const commands = poolShares.calculateBlocks(results, shareData, true, false);
    expect(commands.length).toBe(1);
    expect(commands[0]).toStrictEqual(expected[0]);
  });

  test('Test block command handling [3]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const commands = poolShares.calculateBlocks(results, shareData, true, false);
    expect(commands.length).toBe(0);
  });

  test('Test block command handling [4]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const commands = poolShares.calculateBlocks(results, shareData, false, false);
    expect(commands.length).toBe(0);
  });

  test('Test block command handling [5]', () => {
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{ 'example1': 8, 'example2': 8, 'example3': 8 }, {}, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 32,
      'blockType': 'primary',
      'difficulty': 4,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '4',
    };
    const expected = [
      ['del', 'Pool1:rounds:primary:current:submissions'],
      ['rename', 'Pool1:rounds:primary:current:counts', 'Pool1:rounds:primary:round-1972211:counts'],
      ['rename', 'Pool1:rounds:primary:current:shares', 'Pool1:rounds:primary:round-1972211:shares'],
      ['rename', 'Pool1:rounds:primary:current:times', 'Pool1:rounds:primary:round-1972211:times'],
      ['sadd', 'Pool1:blocks:primary:pending'],
      ['hincrby', 'Pool1:blocks:primary:counts', 'valid', 1]];
    const commands = poolShares.calculateBlocks(results, shareData, true, true);
    expect(commands.length).toBe(6);
    expect(commands[0]).toStrictEqual(expected[0]);
    expect(commands[1]).toStrictEqual(expected[1]);
    expect(commands[2]).toStrictEqual(expected[2]);
    expect(commands[3]).toStrictEqual(expected[3]);
    expect(JSON.parse(commands[4][2]).luck).toBe(87.5);
    expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
    expect(commands[5]).toStrictEqual(expected[5]);
  });

  test('Test command handling and execution', (done) => {
    const dateNow = Date.now();
    const poolShares = new PoolShares(logger, client, poolConfigCopy, configCopy);
    const results = [{}, { 'example': dateNow - 300000 }, {}, {}];
    const shareData = {
      'job': '4',
      'ip': '::1',
      'port': 3001,
      'addrPrimary': 'example',
      'addrAuxiliary': null,
      'blockDiffPrimary': 137403310.58987552,
      'blockType': 'share',
      'difficulty': 1,
      'hash': null,
      'hashInvalid': null,
      'height': 1972211,
      'reward': 10006839,
      'shareDiff': '2.35170820',
    };
    const expected = [
      ['hincrbyfloat', 'Pool1:rounds:primary:current:times', 'example'],
      ['hset', 'Pool1:rounds:primary:current:submissions', 'example'],
      ['zadd', 'Pool1:rounds:primary:current:hashrate'],
      ['hincrby', 'Pool1:rounds:primary:current:counts', 'valid', 1],
      ['hincrbyfloat', 'Pool1:rounds:primary:current:shares']];
    const commands = poolShares.buildCommands(results, shareData, true, false, () => {
      return done();
    });
    expect(commands.length).toBe(5);
    expect(commands[0].slice(0, 3)).toStrictEqual(expected[0]);
    expect(commands[1].slice(0, 3)).toStrictEqual(expected[1]);
    expect(commands[2].slice(0, 2)).toStrictEqual(expected[2]);
    expect(commands[3]).toStrictEqual(expected[3]);
    expect(commands[4].slice(0, 2)).toStrictEqual(expected[4]);
  });
});
