'use strict';

var _ = require('lodash');

var Emitter = require('../src/Emitter');
var ResolvingEmitter = require('../src/ResolvingEmitter');

describe('ResolvingEmitter', function() {

    var resolvingEmitter, emit, fail, onValue, onError;

    beforeEach(function() {
        onValue = jest.fn();
        onError = jest.fn();
        resolvingEmitter = new ResolvingEmitter(
            new Emitter(function(_emit, _fail) {
                emit = _emit;
                fail = _fail;
            })
        );
        resolvingEmitter.next(onValue, onError);
    });

    afterEach(function() {
        emit = null;
        fail = null;
        resolvingEmitter.destroy();
    });

    it('should be an instance of Emitter', function() {
        expect(resolvingEmitter instanceof Emitter).toBe(true);
    });

    it('should have the same base for all instances', function() {
        var resolvingEmitterA = new ResolvingEmitter(function() {});
        var resolvingEmitterB = new ResolvingEmitter(function() {});

        expect(resolvingEmitterA.base).toBe(resolvingEmitterB.base);
    });

    it('should call value handler with emitted non-resolvable value', function() {
        var nonResolvableValue = 1;

        emit(nonResolvableValue);
        jest.runAllTimers();
        expect(onValue.mock.calls[0][0]).toEqual(nonResolvableValue);
    });

    it('should not call value handler when subsequently emit equal non-resolvable value', function() {
        var nonResolvableValue = {};

        emit(nonResolvableValue);
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);

        emit(nonResolvableValue);
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);
    });

    it('should call value handler with value of emitted emitter', function() {
        var nestedValue = { a: 1 };
        var nestedEmitter = new Emitter(function(emit, fail) {
            emit(nestedValue);
        });

        emit(nestedEmitter);
        jest.runAllTimers();
        expect(onValue.mock.calls[0][0]).toEqual(nestedValue);
    });
    
    it('should not call value handler when subsequently emit equal emitters', function() {
        var nestedValue = { b: 2 };
        var nestedEmitterBase = jest.fn(function(emit, fail) {
            emit(nestedValue);
        });

        emit(new Emitter(nestedEmitterBase));
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);
        expect(onValue.mock.calls[0][0]).toBe(nestedValue);

        emit(new Emitter(nestedEmitterBase));
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);
    });

    it('should destroy emitted emitter when being destroyed', function() {
        var nestedEmitterDestructor = jest.fn();
        var nestedEmitter = new Emitter(jest.fn(function() {
            return nestedEmitterDestructor;
        }));

        emit(nestedEmitter);
        jest.runAllTimers();
        expect(nestedEmitterDestructor).not.toBeCalled();

        resolvingEmitter.destroy();
        expect(nestedEmitterDestructor).toBeCalled();
    });

    it('should call error handler when emitted emitter fails', function() {
        var nestedEmitter = new Emitter(jest.fn(function(emit, fail) {
            fail();
        }));

        emit(nestedEmitter);
        jest.runAllTimers();
        expect(onError).toBeCalled();
    });
 
    it('should call value handler with values of emitted emitters grouped in object or array', function() {
        var nestedValue = { a: 1 };
        var nestedEmitterBase = function(emit, fail) {
            emit(nestedValue);
        };

        emit({ nestedValue: new Emitter(nestedEmitterBase) });
        jest.runAllTimers();
        expect(onValue.mock.calls[0][0]).toEqual({ nestedValue: nestedValue });

        emit([new Emitter(nestedEmitterBase)]);
        jest.runAllTimers();
        expect(onValue.mock.calls[1][0]).toEqual([nestedValue]);
    });

    it('should not call value handler when subsequently emit equal emitters groups', function() {
        var nestedValueA = {};
        var nestedValueB = {};
        var nestedValueC = {};

        var nestedEmitterA = new Emitter(jest.fn(function(emit) {
            emit(nestedValueA);
        }));
        var nestedEmitterB = new Emitter(jest.fn(function(emit) {
            emit(nestedValueB);
        }));

        var emittersGroupA = {
            a: nestedEmitterA,
            b: nestedEmitterB,
            c: nestedValueC
        };

        emit(emittersGroupA);
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);
        expect(_.sortBy(Object.keys(onValue.mock.calls[0][0]))).toEqual(['a', 'b', 'c']);
        expect(onValue.mock.calls[0][0].a).toBe(nestedValueA);
        expect(onValue.mock.calls[0][0].b).toBe(nestedValueB);
        expect(onValue.mock.calls[0][0].c).toBe(nestedValueC);

        emit(emittersGroupA);
        jest.runAllTimers();
        expect(onValue.mock.calls.length).toBe(1);
    });
    
    it('should reuse emitted emitters and destroy not reused', function() {
        var nestedValueA = {};
        var nestedValueB = {};
        var nestedValueC = {};
        var nestedValueD = {};
        var nestedValueE = {};

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
        var nestedEmitterDestructorC = jest.fn();
        var nestedEmitterBaseC = jest.fn(function(emit) {
            emit(nestedValueC);
            return nestedEmitterDestructorC;
        });

        emit({
            a: new Emitter(nestedEmitterBaseA),
            b: new Emitter(nestedEmitterBaseB),
            d: nestedValueD
        });
        jest.runAllTimers();
        expect(nestedEmitterBaseA.mock.calls.length).toBe(1);
        expect(nestedEmitterBaseB.mock.calls.length).toBe(1);
        expect(nestedEmitterDestructorA).not.toBeCalled();
        expect(nestedEmitterDestructorB).not.toBeCalled();
        expect(onValue.mock.calls.length).toBe(1);
        expect(_.sortBy(Object.keys(onValue.mock.calls[0][0]))).toEqual(['a', 'b', 'd']);
        expect(onValue.mock.calls[0][0].a).toBe(nestedValueA);
        expect(onValue.mock.calls[0][0].b).toBe(nestedValueB);
        expect(onValue.mock.calls[0][0].d).toBe(nestedValueD);

        emit({
            a: new Emitter(nestedEmitterBaseA),
            b: new Emitter(nestedEmitterBaseB),
            d: nestedValueE
        });
        jest.runAllTimers();
        expect(nestedEmitterBaseA.mock.calls.length).toBe(1);
        expect(nestedEmitterBaseB.mock.calls.length).toBe(1);
        expect(nestedEmitterDestructorA).not.toBeCalled();
        expect(nestedEmitterDestructorB).not.toBeCalled();
        expect(onValue.mock.calls.length).toBe(2);
        expect(_.sortBy(Object.keys(onValue.mock.calls[0][0]))).toEqual(['a', 'b', 'd']);
        expect(onValue.mock.calls[1][0].a).toBe(nestedValueA);
        expect(onValue.mock.calls[1][0].b).toBe(nestedValueB);
        expect(onValue.mock.calls[1][0].d).toBe(nestedValueE);

        emit({
            a: new Emitter(nestedEmitterBaseA),
            c: new Emitter(nestedEmitterBaseC),
            e: nestedValueE
        });
        jest.runAllTimers();
        expect(nestedEmitterBaseA.mock.calls.length).toBe(1);
        expect(nestedEmitterBaseC.mock.calls.length).toBe(1);
        expect(nestedEmitterDestructorA).not.toBeCalled();
        expect(nestedEmitterDestructorB).toBeCalled();
        expect(nestedEmitterDestructorC).not.toBeCalled();
        expect(onValue.mock.calls.length).toBe(3);
        expect(_.sortBy(Object.keys(onValue.mock.calls[2][0]))).toEqual(['a', 'c', 'e']);
        expect(onValue.mock.calls[2][0].a).toBe(nestedValueA);
        expect(onValue.mock.calls[2][0].c).toBe(nestedValueC);
        expect(onValue.mock.calls[2][0].e).toBe(nestedValueE);
    });

    it('should destroy emitters group when being destroyed', function() {
        var nestedEmitterDestructorA = jest.fn();
        var nestedEmitterA = new Emitter(jest.fn(function() {
            return nestedEmitterDestructorA;
        }));
        var nestedEmitterDestructorB = jest.fn();
        var nestedEmitterB = new Emitter(jest.fn(function() {
            return nestedEmitterDestructorB;
        }));

        emit({
            a: nestedEmitterA,
            b: nestedEmitterB
        });
        jest.runAllTimers();
        expect(nestedEmitterDestructorA).not.toBeCalled();
        expect(nestedEmitterDestructorB).not.toBeCalled();

        resolvingEmitter.destroy();
        expect(nestedEmitterDestructorA).toBeCalled();
        expect(nestedEmitterDestructorB).toBeCalled();
    });

    it('should call error handler and destroy emitters group when any of them fails', function() {
        var nestedEmitterDestructorA = jest.fn();
        var nestedEmitterA = new Emitter(jest.fn(function() {
            return nestedEmitterDestructorA;
        }));
        var nestedEmitterDestructorB = jest.fn();
        var nestedEmitterB = new Emitter(jest.fn(function(emit, fail) {
            fail();
            return nestedEmitterDestructorB;
        }));

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
