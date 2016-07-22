'use strict';

var compareEmitters = require('../src/compareEmitters');
var Emitter = require('../src/Emitter');
var ConsumingEmitter = require('../src/ConsumingEmitter');
var ResolvingEmitter = require('../src/ResolvingEmitter');
var funga = require('../src/funga');

describe('funga', function() {

    describe('emit', function() {

        it('should return emitter with provided base and arguments', function() {
            var base = function() {};
            var args = [{a:1}, {b:2}];
            var emit = funga.emit(base);
            var emitter = emit(args[0], args[1]);

            expect(emitter instanceof Emitter).toBe(true);
            expect(emitter.base).toBe(base);
            expect(emitter.args[0]).toBe(args[0]);
            expect(emitter.args[1]).toBe(args[1]);
        });

    });

    describe('consume', function() {

        it('should return consuming emitter with provided digest and arguments', function() {
            var digest = function() {};
            var args = [new Emitter(function() {}), {}];
            var consume = funga.consume(digest);
            var consumingEmitter = consume(args[0], args[1]);

            expect(consumingEmitter instanceof ConsumingEmitter).toBe(true);
            expect(consumingEmitter.args[0]).toBe(digest);
            expect(consumingEmitter.args[1]).toBe(args[0]);
            expect(consumingEmitter.args[2]).toBe(args[1]);
        });

    });

    describe('resolve', function() {

        it('should create resolving emitter with emitter created by provided emitter factory with arguments', function() {
            var args = [{}, {}];
            var resolve = funga.resolve(function() {
                return new Emitter(function() {}, args); 
            });
            var resolvingEmitter = resolve(args[0], args[1]);

            expect(resolvingEmitter instanceof ResolvingEmitter).toBe(true);
            expect(resolvingEmitter.args[0] instanceof Emitter).toBe(true);
            expect(resolvingEmitter.args[0].args[0]).toBe(args[0]);
            expect(resolvingEmitter.args[0].args[1]).toBe(args[1]);
        });

    });

});
