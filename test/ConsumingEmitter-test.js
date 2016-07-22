'use strict';

var _ = require('lodash');

var Emitter = require('../src/Emitter');
var ConsumingEmitter = require('../src/ConsumingEmitter');

describe('ConsumingEmitter', function() {

    var onValue, onError;

    beforeEach(function() {
        onValue = jest.fn();
        onError = jest.fn();
    });

    it('should be an instance of Emitter', function() {
        var consumingEmitter = new ConsumingEmitter(function() {}, []);

        expect(consumingEmitter instanceof Emitter).toBe(true);
    });

    it('should have the same base for all instances', function() {
        var consumingEmitterA = new ConsumingEmitter(function() {}, []);
        var consumingEmitterB = new ConsumingEmitter(function() {}, []);

        expect(consumingEmitterA.base).toBe(consumingEmitterB.base);
    });

    it('should call digest with resolved input', function() {
        var digest = jest.fn();
        var valueA = {};
        var valueB = {};
        var valueC = {};
        var consumer = new ConsumingEmitter(digest, [
            new Emitter(function (emit) { emit(valueA) }),
            new Emitter(function (emit) { emit(valueB) }),
            valueC
        ]);

        consumer.next(onValue, onError);
        jest.runAllTimers();

        expect(digest.mock.calls[0][0]).toBe(valueA);
        expect(digest.mock.calls[0][1]).toBe(valueB);
        expect(digest.mock.calls[0][2]).toBe(valueC);
    });

    it('should emit value returned by digest', function() {
        var value = {};
        var consumer = new ConsumingEmitter(function() {
            return value;
        });

        consumer.next(onValue, onError);
        jest.runAllTimers();

        expect(onValue.mock.calls[0][0]).toBe(value);
    });

    it('should fail when digest throws an error', function() {
        var consumer = new ConsumingEmitter(function() {
            throw new Error();
        });

        consumer.next(onValue, onError);
        jest.runAllTimers();

        expect(onError).toBeCalled();
    });

    it('should destroy input emitters when being destroyed', function() {
        var emitterADestructor = jest.fn();
        var emitterA = new Emitter(function() {
            return emitterADestructor;
        });
        var emitterBDestructor = jest.fn();
        var emitterB = new Emitter(function() {
            return emitterBDestructor;
        });
        var consumer = new ConsumingEmitter(
            function() {},
            [emitterA, emitterB]
        );

        consumer.next(onValue, onError);
        jest.runAllTimers();
        consumer.destroy();
        expect(emitterADestructor).toBeCalled();
        expect(emitterBDestructor).toBeCalled();
    });

    it('should call error handler and destroy input emitters when any of them fails', function() {
        var emitterADestructor = jest.fn();
        var emitterA = new Emitter(function(emit, fail) {
            fail();
            return emitterADestructor;
        });
        var emitterBDestructor = jest.fn();
        var emitterB = new Emitter(function() {
            return emitterBDestructor;
        });
        var consumer = new ConsumingEmitter(
            function() {},
            [emitterA, emitterB]
        );
        
        consumer.next(onValue, onError);
        jest.runAllTimers();
        expect(onError).toBeCalled();
        expect(emitterADestructor).toBeCalled();
        expect(emitterBDestructor).toBeCalled();
    });

});
