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
        var emitterA = new Emitter(base, [1,2]);
        var emitterB = new Emitter(base, [1,2,3]);

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
    });

    it('should return false for emitters with different non-resolvable arguments', function() {
        var base = function() {};
        var ob = {};
        var ob2 = {};
        var emitterA = new Emitter(base, [1, ob]);
        var emitterB = new Emitter(base, [1, ob2]);

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
    });

    it('should return false for emitters with different resolvable arguments', function() {
        var base = function() {};
        var emitterA = new Emitter(base, [1, new Emitter(function() {})]);
        var emitterB = new Emitter(base, [1, new Emitter(function() {})]);

        expect(compareEmitters(emitterA, emitterB)).toBe(false);
    });

    it('should return true in other case', function() {
        var base = function() {};
        var ob = {};
        var emitterA = new Emitter(base, [1, ob, new Emitter(base)]);
        var emitterB = new Emitter(base, [1, ob, new Emitter(base)]);

        expect(compareEmitters(emitterA, emitterB)).toBe(true);
    });

});
