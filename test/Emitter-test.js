'use strict';

var _ = require('lodash');

var Emitter = require('../src/Emitter');

describe('Emitter', function() {

    var emitter;
    var executor;
    var args;
    var destructor;
    var emit;
    var fail;
    var noop = function() {};

    beforeEach(function() {
        destructor = jest.fn();
        executor = jest.fn(function(_emit, _fail) {
            emit = _emit;
            fail = _fail;
            return destructor;
        });
        args = [{}, {}];
        emitter = new Emitter(executor, args);
    });

    afterEach(function() {
        emit = null;
        fail = null;
        emitter.destroy();
    });

    it('should throw an error when executor is not a function', function() {
        expect(function() {
            new Emitter(null);
        }).toThrow();
    });

    it('should expose executor and arguments', function() {
        expect(emitter.executor).toBe(executor);
        expect(emitter.args.length).toBe(2);
        expect(emitter.args[0]).toBe(args[0]);
        expect(emitter.args[1]).toBe(args[1]);
    });

    it('should throw an error on #next call when value handler is not a function', function() {
        expect(function() {
            emitter.next(null, noop);
        }).toThrow();
    });

    it('should throw an error on #next call when error handler is not a function', function() {
        expect(function() {
            emitter.next(noop, null);
        }).toThrow();
    });

    it('should call executor on first #next call', function() {
        expect(executor).not.toBeCalled();

        emitter.next(noop, noop);
        expect(executor).toBeCalled();
    });

    it('should pass arguments to executor', function() {
        emitter.next(noop, noop);
        jest.runAllTimers();
        expect(executor.mock.calls[0][2]).toBe(args[0]);
        expect(executor.mock.calls[0][3]).toBe(args[1]);
    });

    it('should not call executor on subsequent #next calls', function() {
        emitter.next(noop, noop);
        jest.runAllTimers();
        emitter.next(noop, noop);
        jest.runAllTimers();
        expect(executor.mock.calls.length).toBe(1);
    });

    it('should call asynchronously value handler with value passed to emit', function() {
        var value = {a: 1, b: 2};
        var onValue = jest.fn();

        emitter.next(onValue, noop);
        jest.runAllTimers();
        expect(onValue).not.toBeCalled();

        emit(value);
        jest.runAllTimers();
        expect(onValue).toBeCalled();
        expect(onValue.mock.calls[0][0]).toBe(value);
    });

    it('should not call pending value handler after subsequent emit calls', function() {
        var onValue = jest.fn();

        emitter.next(onValue, noop);
        jest.runAllTimers();
        expect(onValue).not.toBeCalled();

        emit();
        emit();
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);
    });


    it('should not call pending value handler after being destroyed', function() {
        var onValue = jest.fn();

        emitter.next(onValue, noop);
        jest.runAllTimers();
        expect(onValue).not.toBeCalled();

        emit();
        emitter.destroy();
        jest.runAllTimers();
        expect(onValue).not.toBeCalled();
    });

    it('should call asynchronously error handler with error passed to fail function', function() {
        var onError = jest.fn();
        var error = new Error();

        emitter.next(noop, onError);
        jest.runAllTimers();
        expect(onError).not.toBeCalled();

        fail(error);
        jest.runAllTimers();
        expect(onError).toBeCalled();
        expect(onError.mock.calls[0][0]).toBe(error);
    });

    it('should call error handler when executor throws an error', function() {
        var onError = jest.fn();

        emitter = new Emitter(function() { throw new Error(); });

        expect(onError).not.toBeCalled();

        emitter.next(noop, onError);
        jest.runAllTimers();
        expect(onError).toBeCalled();
    });

    it('should not call pending error handler after being destroyed', function() {
        var onError = jest.fn();

        emitter.next(noop, onError);
        jest.runAllTimers();
        fail();
        emitter.destroy();
        jest.runAllTimers();
        expect(onError).not.toBeCalled();
    });

    it('should call destructor when being destroyed', function() {
        emitter.next(noop, noop);
        jest.runAllTimers();
        expect(destructor).not.toBeCalled();

        emitter.destroy();
        expect(destructor).toBeCalled();
    });

    it('should call destructor after fail has been called', function() {
        emitter.next(noop, noop);
        jest.runAllTimers();
        expect(destructor).not.toBeCalled();

        fail();
        expect(destructor).toBeCalled();
    });

    it('should throw an error on emit calls after being destroyed', function() {
        emitter.next(noop, noop);
        jest.runAllTimers();
        emitter.destroy();
        expect(emit).toThrow();
    });

    it('should throw an error on fail calls after being destroyed', function() {
        emitter.next(noop, noop);
        jest.runAllTimers();
        emitter.destroy();
        expect(fail).toThrow();
    });

    it('should call value handler with resolved emitter', function() {
        var nestedValue = {a: 1};
        var nestedEmitter = new Emitter(function(emit, fail) {
            emit(nestedValue);
        });
        var onValue = jest.fn();

        emitter.next(onValue, noop);
        jest.runAllTimers();
        emit(nestedEmitter);
        jest.runAllTimers();
        expect(onValue.mock.calls[0][0]).toEqual(nestedValue);
    });

    it('should reuse subsequently emitted equal emitters', function() {
        var nestedValue = {a: 1};
        var nestedEmit;
        var nestedEmitterBase = jest.fn(function(emit, fail) {
            nestedEmit = emit;
        });
        var nestedEmitterA = new Emitter(nestedEmitterBase);
        var nestedEmitterB = new Emitter(nestedEmitterBase);
        var onValue = jest.fn();

        emitter.next(onValue, noop);
        jest.runAllTimers();
        emit(nestedEmitterA);
        jest.runAllTimers();
        expect(nestedEmitterBase.mock.calls.length).toBe(1)

        emit(nestedEmitterB);
        jest.runAllTimers();
        expect(nestedEmitterBase.mock.calls.length).toBe(1)

        nestedEmit(nestedValue);
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);
        expect(onValue.mock.calls[0][0]).toEqual(nestedValue);

        emit(nestedEmitterA);
        jest.runAllTimers();
        expect(nestedEmitterBase.mock.calls.length).toBe(1)
        expect(onValue.mock.calls.length).toBe(2);
        expect(onValue.mock.calls[1][0]).toEqual(nestedValue);
    });
    
    it('should destroy nested emitter when being destroyed', function() {
        var nestedEmitterDestructor = jest.fn();
        var nestedEmitter = new Emitter(jest.fn(function() {
            return nestedEmitterDestructor;
        }));

        emitter.next(noop, noop);
        jest.runAllTimers();
        emit(nestedEmitter);
        jest.runAllTimers();
        expect(nestedEmitterDestructor).not.toBeCalled();

        emitter.destroy();
        expect(nestedEmitterDestructor).toBeCalled();
    });

    it('should call error handler when nested emitter throws an error', function() {
        var nestedEmitter = new Emitter(jest.fn(function(emit, fail) {
            fail(new Error());
        }));
        var onError = jest.fn();

        emitter.next(noop, onError);
        jest.runAllTimers();
        emit(nestedEmitter);
        jest.runAllTimers();
        expect(onError).toBeCalled();
    });
 
    it('should call value handler with resolved enumerable', function() {
        var nestedValue = {a: 1};
        var nestedEmitterBase = function(emit, fail) {
            emit(nestedValue);
        };
        var onValue = jest.fn()

        emitter.next(onValue, noop);
        jest.runAllTimers();
        emit({ nestedValue: new Emitter(nestedEmitterBase) });
        jest.runAllTimers();
        expect(onValue.mock.calls[0][0]).toEqual({ nestedValue: nestedValue });

        emit([new Emitter(nestedEmitterBase)]);
        jest.runAllTimers();
        expect(onValue.mock.calls[1][0]).toEqual([nestedValue]);
    });

    it('should reuse emitters in enumerable and destroy not reused', function() {
        var nestedValueA = {};
        var nestedValueB = {};
        var nestedValueC = {};
        var nestedValueD = {};

        var nestedEmitterDestructorA = jest.fn();
        var nestedEmitterBaseA = jest.fn(function(emit) {
            emit(nestedValueA);
            return nestedEmitterDestructorA;
        });
        var nestedEmitterDestructorB = jest.fn();
        var nestedEmitterBaseB = jest.fn(function(emit) {
            emit(nestedValueB);
            return nestedEmitterDestructorB;
        });

        var onValue = jest.fn();

        emitter.next(onValue, noop);
        jest.runAllTimers();
        emit({
            a: new Emitter(nestedEmitterBaseA),
            b: new Emitter(nestedEmitterBaseB),
            c: nestedValueC
        });
        jest.runAllTimers();
        expect(nestedEmitterBaseA.mock.calls.length).toBe(1);
        expect(nestedEmitterBaseB.mock.calls.length).toBe(1);
        expect(nestedEmitterDestructorA).not.toBeCalled();
        expect(nestedEmitterDestructorB).not.toBeCalled();
        expect(onValue.mock.calls.length).toBe(1);
        expect(_.sortBy(Object.keys(onValue.mock.calls[0][0]))).toEqual(['a', 'b', 'c']);
        expect(onValue.mock.calls[0][0].a).toBe(nestedValueA);
        expect(onValue.mock.calls[0][0].b).toBe(nestedValueB);
        expect(onValue.mock.calls[0][0].c).toBe(nestedValueC);

        emit({
            a: new Emitter(nestedEmitterBaseA),
            c: nestedValueD
        });
        jest.runAllTimers();
        expect(nestedEmitterBaseA.mock.calls.length).toBe(1);
        expect(nestedEmitterBaseB.mock.calls.length).toBe(1);
        expect(nestedEmitterDestructorA).not.toBeCalled();
        expect(nestedEmitterDestructorB).toBeCalled();
        expect(onValue.mock.calls.length).toBe(2);
        expect(_.sortBy(Object.keys(onValue.mock.calls[1][0]))).toEqual(['a', 'c']);
        expect(onValue.mock.calls[1][0].a).toBe(nestedValueA);
        expect(onValue.mock.calls[1][0].c).toBe(nestedValueD);
    });

    it('should destroy emitters in enumerable when being destroyed', function() {
        var nestedEmitterDestructorA = jest.fn();
        var nestedEmitterA = new Emitter(jest.fn(function() {
            return nestedEmitterDestructorA;
        }));

        emitter.next(noop, noop);
        jest.runAllTimers();
        emit({ a: nestedEmitterA });
        jest.runAllTimers();
        expect(nestedEmitterDestructorA).not.toBeCalled();

        emitter.destroy();
        expect(nestedEmitterDestructorA).toBeCalled();
    });

    it('should call error handler and destroy emitters in enumerable when any of them fails', function() {
        var nestedEmitterDestructorA = jest.fn();
        var nestedEmitterA = new Emitter(jest.fn(function() {
            return nestedEmitterDestructorA;
        }));
        var nestedEmitterDestructorB = jest.fn();
        var nestedEmitterB = new Emitter(jest.fn(function(emit, fail) {
            setTimeout(fail);
            return nestedEmitterDestructorB;
        }));
        var onError = jest.fn();

        emitter.next(noop, onError);
        jest.runAllTimers();
        emit({
            a: nestedEmitterA,
            b: nestedEmitterB,
        });
        jest.runAllTimers();
        expect(onError).toBeCalled();
        expect(nestedEmitterDestructorA).toBeCalled();
        expect(nestedEmitterDestructorB).toBeCalled();
    });

});
