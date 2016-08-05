'use strict';

var Emitter = require('../src/Emitter');
var compareEmitters = require('../src/compareEmitters');

describe('compareEmitters', function() {

    it('should return false for emitters with different executor', function() {
        var emitterA = new Emitter(function() {});
        var emitterB = new Emitter(function() {});

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
    });

    it('should return false for emitters with different arguments length', function() {
        var executor = function() {};
        var emitterA = new Emitter(executor, [1, 2]);
        var emitterB = new Emitter(executor, [1, 2, 3]);

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
    });

    it('should return false for emitters with different non-resolvable arguments', function() {
        var executor = function() {};
        var emitterA = new Emitter(executor, [{a: 1}]);
        var emitterB = new Emitter(executor, [{a: 2}]);
        var emitterC = new Emitter(executor, [{a: 1, b: 2}]);
        var emitterD = new Emitter(executor, [null]);
        var emitterE = new Emitter(executor, [1]);

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
        expect(compareEmitters(emitterA, emitterC)).toBe(false);
        expect(compareEmitters(emitterA, emitterD)).toBe(false);
        expect(compareEmitters(emitterA, emitterE)).toBe(false);
    });

    it('should return false for emitters with different resolvable arguments', function() {
        var executor = function() {};
        var emitterA = new Emitter(executor, [new Emitter(function() {})]);
        var emitterB = new Emitter(executor, [new Emitter(function() {})]);

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
    });

    it('should return true in other case', function() {
        var executor = function() {};
        var emitterA = new Emitter(executor, [1, {a: 1, b: 2}, new Emitter(executor)]);
        var emitterB = new Emitter(executor, [1, {a: 1, b: 2}, new Emitter(executor)]);

        expect(compareEmitters(emitterA, emitterB)).toBe(true);
    });

});
