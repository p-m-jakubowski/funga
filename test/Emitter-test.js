'use strict';

var _ = require('lodash');

var Emitter = require('../src/Emitter');

var noop = function() {};

describe('Emitter', function() {

    var emitter;
    var emit;
    var fail;

    beforeEach(function() {
        emitter = new Emitter(function (_emit, _fail) {
            emit = _emit;
            fail = _fail;
        });
        jest.runAllTimers();
    });

    it('should throw an error when executor is not a function', function() {
        expect(function() {
            new Emitter(null);
        }).toThrow();
    });

    it('should expose executor and arguments', function() {
        var executor = function() {};
        var args = [{}, {}];
        var emitter = new Emitter(executor, args);

        expect(emitter.executor).toBe(executor);
        expect(emitter.args.length).toBe(2);
        expect(emitter.args[0]).toBe(args[0]);
        expect(emitter.args[1]).toBe(args[1]);
    });

    it('should call executor asynchronously', function() {
        var executor = jest.fn();
        var emitter = new Emitter(executor);

        expect(executor).not.toBeCalled();

        jest.runAllTimers();
        expect(executor).toBeCalled();
    });

    it('should pass arguments to executor', function() {
        var executor = jest.fn();
        var args = [{}, {}];
        var emitter = new Emitter(executor, args);

        jest.runAllTimers();
        expect(executor.mock.calls[0][2]).toBe(args[0]);
        expect(executor.mock.calls[0][3]).toBe(args[1]);
    });

    it('should not call pending executor after being canceled', function() {
        var executor = jest.fn();
        var emitter = new Emitter(executor);

        expect(executor).not.toBeCalled();

        emitter.cancel();
        jest.runAllTimers();
        expect(executor).not.toBeCalled();
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

    it('should call value handlers asynchronously with value passed to emit', function() {
        var onValueA = jest.fn();
        var onValueB = jest.fn();
        var value = {a: 1, b: 2};

        emitter.next(onValueA, noop);
        emitter.next(onValueB, noop);
        emit(value);
        expect(onValueA).not.toBeCalled();
        expect(onValueB).not.toBeCalled();

        jest.runAllTimers();
        expect(onValueA).toBeCalled();
        expect(onValueB).toBeCalled();
        expect(onValueA.mock.calls[0][0]).toBe(value);
        expect(onValueB.mock.calls[0][0]).toBe(value);
    });

    it('should call newly registered value handler asynchronously with last emitted value', function() {
        var onValue = jest.fn();
        var value = {a: 1, b: 2};

        emit(value);
        jest.runAllTimers();
        emitter.next(onValue, noop);
        expect(onValue).not.toBeCalled();

        jest.runAllTimers();
        expect(onValue).toBeCalled();
        expect(onValue.mock.calls[0][0]).toBe(value);
    });

    it('should not call pending value handlers after subsequent emit calls', function() {
        var onValueA = jest.fn();
        var onValueB = jest.fn();

        emitter.next(onValueA, noop);
        emitter.next(onValueB, noop);
        emit();
        emit();
        jest.runAllTimers();
        expect(onValueA.mock.calls.length).toBe(1);
        expect(onValueB.mock.calls.length).toBe(1);
    });

    it('should not call pending value handlers after being canceled', function() {
        var onValueA = jest.fn();
        var onValueB = jest.fn();

        emitter.next(onValueA, noop);
        emitter.next(onValueB, noop);
        emit();
        emitter.cancel();
        jest.runAllTimers();
        expect(onValueA).not.toBeCalled();
        expect(onValueB).not.toBeCalled();
    });

    it('should call error handlers asynchronously with error passed to fail function', function() {
        var onErrorA = jest.fn();
        var onErrorB = jest.fn();
        var error = new Error();

        emitter.next(noop, onErrorA);
        emitter.next(noop, onErrorB);
        fail(error);
        expect(onErrorA).not.toBeCalled();
        expect(onErrorB).not.toBeCalled();

        jest.runAllTimers();
        expect(onErrorA).toBeCalled();
        expect(onErrorB).toBeCalled();
        expect(onErrorA.mock.calls[0][0]).toBe(error);
        expect(onErrorB.mock.calls[0][0]).toBe(error);
    });

    it('should call error handlers when executor throws an error', function() {
        var emitter = new Emitter(function() {
            throw new Error();
        });
        var onErrorA = jest.fn();
        var onErrorB = jest.fn();

        emitter.next(noop, onErrorA);
        emitter.next(noop, onErrorB);
        jest.runAllTimers();
        expect(onErrorA).toBeCalled();
        expect(onErrorB).toBeCalled();
    });

    it('should call newly registered error handler asynchronously with thrown error', function() {
        var onError = jest.fn();

        fail(new Error());
        jest.runAllTimers();
        emitter.next(noop, onError);
        expect(onError).not.toBeCalled();

        jest.runAllTimers();
        expect(onError).toBeCalled();
    });

    it('should not call pending error handlers after being canceled', function() {
        var onErrorA = jest.fn();
        var onErrorB = jest.fn();

        emitter.next(noop, onErrorA);
        emitter.next(noop, onErrorB);
        fail();
        emitter.cancel();
        jest.runAllTimers();
        expect(onErrorA).not.toBeCalled();
        expect(onErrorB).not.toBeCalled();
    });

    it('should call destructor when being canceled', function() {
        var destructor = jest.fn();
        var emitter = new Emitter(function() {
            return destructor;
        });

        jest.runAllTimers();
        expect(destructor).not.toBeCalled();

        emitter.cancel();
        expect(destructor).toBeCalled();
    });

    it('should call error handlers with error thrown by destructor', function() {
        var error = new Error();
        var emitter = new Emitter(function() {
            return function() {
                throw error;
            };
        });
        var onErrorA = jest.fn();
        var onErrorB = jest.fn();

        emitter.next(noop, onErrorA);
        emitter.next(noop, onErrorB);
        jest.runAllTimers();
        emitter.cancel();
        jest.runAllTimers();
        expect(onErrorA).toBeCalled();
        expect(onErrorB).toBeCalled();
        expect(onErrorA.mock.calls[0][0]).toBe(error);
        expect(onErrorB.mock.calls[0][0]).toBe(error);
    });

    it('should eventually call error handlers with error thrown by destructor when failing', function() {
        var error = new Error();
        var emitter = new Emitter(function(emit, fail) {
            setTimeout(fail);
            return function() {
                throw error;
            };
        });
        var onErrorA = jest.fn();
        var onErrorB = jest.fn();

        emitter.next(noop, onErrorA);
        emitter.next(noop, onErrorB);
        jest.runAllTimers();
        expect(onErrorA).toBeCalled();
        expect(onErrorB).toBeCalled();
        expect(onErrorA.mock.calls[0][0]).toBe(error);
        expect(onErrorB.mock.calls[0][0]).toBe(error);
    });

    it('should not call destructor on subsequent #cancel calls', function() {
        var destructor = jest.fn();
        var emitter = new Emitter(function() {
            return destructor;
        });

        jest.runAllTimers();
        emitter.cancel();
        emitter.cancel();
        emitter.cancel();
        expect(destructor.mock.calls.length).toBe(1);
    });

    it('should call destructor after fail has been called', function() {
        var fail;
        var destructor = jest.fn();
        var emitter = new Emitter(function(_emit, _fail) {
            fail = _fail;
            return destructor;
        });

        jest.runAllTimers();
        expect(destructor).not.toBeCalled();

        fail();
        expect(destructor).toBeCalled();
    });

    it('should throw an error on emit calls after being canceled', function() {
        emitter.cancel();
        expect(emit).toThrow();
    });

    it('should throw an error on fail calls after being canceled', function() {
        emitter.cancel();
        expect(fail).toThrow();
    });

    it('should call value handler with resolved emitter', function() {
        var nestedValue = {a: 1};
        var nestedEmitter = new Emitter(function(emit) {
            emit(nestedValue);
        });
        var onValue = jest.fn();

        emitter.next(onValue, noop);
        emit(nestedEmitter);
        jest.runAllTimers();
        expect(onValue.mock.calls[0][0]).toEqual(nestedValue);
    });

    it('should reuse subsequently emitted equal emitters', function() {
        var nestedEmit;
        var nestedEmitterDestructor = jest.fn();
        var nestedEmitterBase = jest.fn(function(emit, fail) {
            nestedEmit = emit;
            return nestedEmitterDestructor;
        });
        var nestedEmitter = new Emitter(nestedEmitterBase);
        var nestedValue = {a: 1};
        var onValue = jest.fn();

        emitter.next(onValue, noop);
        emit(nestedEmitter);
        jest.runAllTimers();
        expect(nestedEmitterBase.mock.calls.length).toBe(1)

        emit(nestedEmitter);
        jest.runAllTimers();
        expect(nestedEmitterBase.mock.calls.length).toBe(1)

        nestedEmit(nestedValue);
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);
        expect(onValue.mock.calls[0][0]).toEqual(nestedValue);

        emit(new Emitter(nestedEmitterBase));
        jest.runAllTimers();
        expect(nestedEmitterBase.mock.calls.length).toBe(1)
        expect(nestedEmitterDestructor).not.toBeCalled();
        expect(onValue.mock.calls.length).toBe(2);
        expect(onValue.mock.calls[1][0]).toEqual(nestedValue);
    });
    
    it('should cancel nested emitter when being canceled', function() {
        var nestedEmitterDestructor = jest.fn();
        var nestedEmitter = new Emitter(jest.fn(function() {
            return nestedEmitterDestructor;
        }));

        emit(nestedEmitter);
        jest.runAllTimers();
        expect(nestedEmitterDestructor).not.toBeCalled();

        emitter.cancel();
        expect(nestedEmitterDestructor).toBeCalled();
    });

    it('should call error handler when nested emitter throws an error', function() {
        var nestedEmitter = new Emitter(jest.fn(function(emit, fail) {
            fail(new Error());
        }));
        var onError = jest.fn();

        emitter.next(noop, onError);
        emit(nestedEmitter);
        jest.runAllTimers();
        expect(onError).toBeCalled();
    });
 
    it('should call value handler with resolved enumerable', function() {
        var nestedEmitterBase = function(emit, fail) {
            emit(nestedValue);
        };
        var onValue = jest.fn()
        var nestedValue = {a: 1};

        emitter.next(onValue, noop);
        emit({ nestedValue: new Emitter(nestedEmitterBase) });
        jest.runAllTimers();
        expect(onValue.mock.calls[0][0]).toEqual({ nestedValue: nestedValue });

        emit([new Emitter(nestedEmitterBase)]);
        jest.runAllTimers();
        expect(onValue.mock.calls[1][0]).toEqual([nestedValue]);
    });

    it('should reuse emitters in enumerable and cancel not reused', function() {
        var nestedEmitterDestructorA = jest.fn();
        var nestedEmitterDestructorB = jest.fn();
        var nestedEmitterBaseA = jest.fn(function(emit) {
            emit(nestedValueA);
            return nestedEmitterDestructorA;
        });
        var nestedEmitterBaseB = jest.fn(function(emit) {
            emit(nestedValueB);
            return nestedEmitterDestructorB;
        });
        var onValue = jest.fn();
        var nestedValueA = {};
        var nestedValueB = {};
        var nestedValueC = {};
        var nestedValueD = {};

        emitter.next(onValue, noop);
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

    it('should cancel emitters in enumerable when being canceled', function() {
        var nestedEmitterDestructorA = jest.fn();
        var nestedEmitterA = new Emitter(jest.fn(function() {
            return nestedEmitterDestructorA;
        }));

        emit({ a: nestedEmitterA });
        jest.runAllTimers();
        expect(nestedEmitterDestructorA).not.toBeCalled();

        emitter.cancel();
        expect(nestedEmitterDestructorA).toBeCalled();
    });

    it('should call error handler and cancel emitters in enumerable when any of them fails', function() {
        var nestedEmitterDestructorA = jest.fn();
        var nestedEmitterDestructorB = jest.fn();
        var nestedEmitterA = new Emitter(jest.fn(function() {
            return nestedEmitterDestructorA;
        }));
        var nestedEmitterB = new Emitter(jest.fn(function(emit, fail) {
            setTimeout(fail);
            return nestedEmitterDestructorB;
        }));
        var onError = jest.fn();

        emitter.next(noop, onError);
        emit({
            a: nestedEmitterA,
            b: nestedEmitterB,
        });
        jest.runAllTimers();
        expect(onError).toBeCalled();
        expect(nestedEmitterDestructorA).toBeCalled();
        expect(nestedEmitterDestructorB).toBeCalled();
    });

    describe('#next result', function() {

        it('should be an instance of Emitter', function() {
            expect(emitter.next(noop, noop) instanceof Emitter).toBe(true);
        });

        it('should emit values returned by onValue', function() {
            var onValue = function(value) {
                return value.length;
            };
            var onValueNext = jest.fn();
            
            emitter.next(onValue, noop).next(onValueNext, noop);
            emit('abc');
            jest.runAllTimers();
            expect(onValueNext.mock.calls[0][0]).toBe(3);

            emit('abcdef');
            jest.runAllTimers();
            expect(onValueNext.mock.calls[1][0]).toBe(6);
        });

        it('should be canceled when former emitter is canceled', function() {
            var destructorNext = jest.fn();
            var emitterNext = new Emitter(function() {
                return destructorNext;
            });

            emitter.next(function() { return emitterNext; }, noop);
            emit();
            jest.runAllTimers();
            expect(destructorNext).not.toBeCalled();

            emitter.cancel();
            jest.runAllTimers();
            expect(destructorNext).toBeCalled();
        });

        it('should be canceled when former emitter throws an error', function() {
            var destructorNext = jest.fn();
            var emitterNext = new Emitter(function() {
                return destructorNext;
            });

            emitter.next(function() { return emitterNext; }, noop).next(noop, noop);
            emit();
            jest.runAllTimers();
            expect(destructorNext).not.toBeCalled();

            fail();
            jest.runAllTimers();
            expect(destructorNext).toBeCalled();
        });

        it('should fail when onValue throws an error', function() {
            var onError = jest.fn();

            emitter.next(function() { throw new Error(); }, noop).next(noop, onError);
            expect(onError).not.toBeCalled();

            emit();
            jest.runAllTimers();
            expect(onError).toBeCalled();
        });

        it('should fail when onError throws an error', function() {
            var onError = jest.fn();

            emitter.next(noop, function() { throw new Error(); }).next(noop, onError);
            expect(onError).not.toBeCalled();

            fail();
            jest.runAllTimers();
            expect(onError).toBeCalled();
        });

    });

});
