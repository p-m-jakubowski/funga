'use strict';

var ReactivePromise = require('../src/ReactivePromise');
var createFactory = require('../src/ReactivePromise-createFactory');

var mod = require('../src/index');

describe('module', function() {

    it('should export ReactivePromise constructor as default', function() {
        expect(mod).toBe(ReactivePromise);
    });

    it('should export ReactivePromise-createFactory as #createFactory', function() {
        expect(mod.createFactory).toBe(createFactory);
    });

});
