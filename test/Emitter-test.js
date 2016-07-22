'use strict';

var _ = require('lodash');

var Emitter = require('../src/Emitter');

describe('Emitter', function() {

    var emitter, base, args, destructor, onValue, onError, emit, fail;

    beforeEach(function() {
        destructor = jest.fn();
        base = jest.fn(function(_emit, _fail) {
            emit = _emit;
            fail = _fail;
            return destructor;
        });
        args = [{}, {}];
        emitter = new Emitter(base, args);
        onValue = jest.fn();
        onError = jest.fn();
    });

    afterEach(function() {
        emit = null;
        fail = null;
        emitter.destroy();
    });

    it('should throw an error when base is not a function', function() {
        expect(function() {
            new Emitter(null);
        }).toThrow();
    });

    it('should expose base and arguments', function() {
        expect(emitter.base).toBe(base);
        expect(emitter.args.length).toBe(2);
        expect(emitter.args[0]).toBe(args[0]);
        expect(emitter.args[1]).toBe(args[1]);
    });

    it('should throw an error on `next` method call when value handler is not a function', function() {
        expect(function() {
            emitter.next(null, onError);
        }).toThrow();
    });

    it('should throw an error on `next` method call when error handler is not a function', function() {
        expect(function() {
            emitter.next(onValue, null);
        }).toThrow();
    });

    it('should call error handler when base throws an error', function() {
        emitter = new Emitter(function() { throw new Error(); });

        expect(onError).not.toBeCalled();

        emitter.next(onValue, onError);
        jest.runAllTimers();
        expect(onError).toBeCalled();
    });

    it('should call base with arguments', function() {
        emitter.next(onValue, onError);
        expect(base.mock.calls[0][2]).toBe(args[0]);
        expect(base.mock.calls[0][3]).toBe(args[1]);
    });

    it('should not call base on subsequent `next` method calls', function() {
        emitter.next(onValue, onError);
        expect(base.mock.calls.length).toBe(1);

        emitter.next(onValue, onError);
        expect(base.mock.calls.length).toBe(1);
    });

    it('should not call base on `next` method call after being destroyed', function() {
        emitter.destroy();
        expect(base).not.toBeCalled();

        emitter.next(onValue, onError);
        expect(base).not.toBeCalled();
    });

    it('should call destructor when being destroyed', function() {
        emitter.next(onValue, onError);
        expect(destructor).not.toBeCalled();

        emitter.destroy();
        expect(destructor).toBeCalled();
    });

    it('should be able to be destroyed when base does not return destructor', function() {
        emitter = new Emitter(function() {});
        emitter.next(onValue, onError);
        emitter.destroy();
    });

    it('should call destructor asynchronously after fail has been called', function() {
        emitter.next(onValue, onError);
        expect(destructor).not.toBeCalled();

        fail();
        jest.runAllTimers();
        expect(destructor).toBeCalled();
    });

    it('should call value handler asynchronously', function() {
        emitter.next(onValue, onError);
        emit();
        expect(onValue).not.toBeCalled();

        jest.runAllTimers();
        expect(onValue).toBeCalled();
    });

    it('should not call pending value handler after subsequent emit calls', function() {
        emitter.next(onValue, onError);
        expect(onValue).not.toBeCalled();

        emit();
        emit();
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);
    });

    it('should not call pending value handler after being destroyed', function() {
        emitter.next(onValue, onError);
        expect(onValue).not.toBeCalled();

        emit();
        emitter.destroy();
        jest.runAllTimers();
        expect(onValue).not.toBeCalled();
    });

    it('should call error handler asynchronously', function() {
        emitter.next(onValue, onError);
        fail();
        expect(onError).not.toBeCalled();

        jest.runAllTimers();
        expect(onError).toBeCalled();
    });

    it('should not call pending error handler after being destroyed', function() {
        emitter.next(onValue, onError);
        fail();
        emitter.destroy();
        jest.runAllTimers();
        expect(onError).not.toBeCalled();
    });

    it('should call error handler with error passed to fail function', function() {
        var error = new Error();

        emitter.next(onValue, onError);
        fail(error);
        jest.runAllTimers();
        expect(onError.mock.calls[0][0]).toBe(error);
    });

    it('should fail emit calls after being destroyed', function() {
        emitter.next(onValue, onError);
        emitter.destroy();
        expect(emit).toThrow();
    });

    it('should fail fail calls after being destroyed', function() {
        emitter.next(onValue, onError);
        emitter.destroy();
        expect(fail).toThrow();
    });

});
