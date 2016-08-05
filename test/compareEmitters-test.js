'use strict';

var Emitter = require('../src/Emitter');
var compareEmitters = require('../src/compareEmitters');

describe('compareEmitters', function() {

    it('should return false for emitters with different base', function() {
        var emitterA = new Emitter(function() {});
        var emitterB = new Emitter(function() {});

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
    });

    it('should return false for emitters with different arguments length', function() {
        var base = function() {};
        var emitterA = new Emitter(base, [1, 2]);
        var emitterB = new Emitter(base, [1, 2, 3]);

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
    });

    it('should return false for emitters with different non-resolvable arguments', function() {
        var base = function() {};
        var emitterA = new Emitter(base, [{a: 1}]);
        var emitterB = new Emitter(base, [{a: 2}]);
        var emitterC = new Emitter(base, [{a: 1, b: 2}]);
        var emitterD = new Emitter(base, [null]);
        var emitterE = new Emitter(base, [1]);

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
        expect(compareEmitters(emitterA, emitterC)).toBe(false);
        expect(compareEmitters(emitterA, emitterD)).toBe(false);
        expect(compareEmitters(emitterA, emitterE)).toBe(false);
    });

    it('should return false for emitters with different resolvable arguments', function() {
        var base = function() {};
        var emitterA = new Emitter(base, [new Emitter(function() {})]);
        var emitterB = new Emitter(base, [new Emitter(function() {})]);

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
    });

    it('should return true in other case', function() {
        var base = function() {};
        var emitterA = new Emitter(base, [1, {a: 1, b: 2}, new Emitter(base)]);
        var emitterB = new Emitter(base, [1, {a: 1, b: 2}, new Emitter(base)]);

        expect(compareEmitters(emitterA, emitterB)).toBe(true);
    });

});
