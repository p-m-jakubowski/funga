# reactive-promise

Library that implements a reactive variation on Promise.  

* [Overview](#overview)
* [Installation](#installation)
* [Usage](#usage)
  * [Basic](#basic)
  * [Cancellation](#cancellation)
  * [Smart resolving](#smart-resolving)
  * [Known limitations](#known-limitations)

## Overview

ReactivePromise is very similar to Promise.  
It differs in that, it can change its value (i.e. can be resolved more than once).  
It also includes features like [cancellation](#cancellation) and [smart resolving](#smart-resolving).  

## Installation

```
npm install --save reactive-promise
```

It's an isomorphic module, so you can use it with [Browserify](https://github.com/substack/node-browserify) 
or [webpack](https://github.com/webpack/webpack).

If you want to use it with [RequireJS](https://github.com/requirejs/requirejs) or as global variable in browser environment
you have to run `npm run build` - it will create `reactive-promise.min.js` script in UMD format under `build/` directory.

## Usage

### Basic

```javascript
const ReactivePromise = require('reactive-promise');
```

You create ReactivePromise similar to Promise.  
Function passed to ReactivePromise (*executor*) is called asynchronously.  
NOTE: reactive-promise will be rejected if executor throws an error.

```javascript
var reactivePromise = new ReactivePromise(function(resolve, reject) {
    // ...
});
```

You can call `resolve` multiple times.

```javascript
var reactivePromise = new ReactivePromise(function(resolve, reject) {
    var counter = 0;
    setInterval(function() {
        resolve(counter);
        counter++;
    }, 1000);
});
```

But reject can be called only once.  

```javascript
var reactivePromise = new ReactivePromise(function(resolve, reject) {
    reject(new Error());

    setTimeout(function() {
        reject(new Error()); // <-- this will fail
    });
});
```

If you want to read reactive-promise value (or error), run its `next` method (it's ReactivePromise equivalent of Promise's `then`).  
`next` returns instance of ReactivePromise, that resolves the result of value handler.  

```javascript
reactivePromise.next(
    function (value) {
        return value * 2;
    }, function (error) {
        // ...
    })
    .next(console.log, console.error);

// console will print: 0, 2, 4, 6, 8...
```

You may also pass additional parameters to executor.
```javascript
var reactivePromise = new ReactivePromise(function (resolve, reject, param1, param2) {
    // ... 
}, ['param-1', 'param-2']);
```

### Cancellation

You may return destructor, that is used when reactive-promise is cancelled or rejected.

```javascript
var reactivePromise = new ReactivePromise(function(resolve, reject) {
    var counter = 0;
    var interval = setInterval() {
        resolve(counter);
        counter++;
    };

    return function() {
        clearInterval(interval);
    };
});

// on next tick
reactivePromise.cancel();
```

NOTE: reactive-promise will be rejected if destructor throws an error.

### Smart resolving

If you pass instance of ReactivePromise to `resolve` function, reactive-promise will resolve deeply.

```javascript
var reactivePromise = new ReactivePromise(function(resolve, reject) {
    resolve(new ReactivePromise(function(_resolve, _reject) {
        _resolve(1);
    }));
});

reactivePromise.next(console.log, console.error); 
// console will print 1
```

Nested reactive-promises are resolved in a smart way.
```javascript
var nestedExecutor = function(resolve, reject) {
    console.log('create nested reactive-promise');
    resolve(1);
};

var reactivePromise = new ReactivePromise(function(resolve, reject) {
    resolve(new ReactivePromise(nestedExecutor));

    setTimeout(function() {
        resolve(new ReactivePromise(nestedExecutor));
    });
});

reactivePromise.next(console.log, console.error); 

// console will print three times: 
// 1) 'create nested reactive-promise'
// 2) 1
// 3) 1
```

What happened here? When resolve is subsequently called with equal reactive-promise it simply cancels latter one (before it calls its executor),
resolves to value of former and continue using it.  

When two reactive-promises are considered equal?
```javascript
var executor = function() {}

// equal
new ReactivePromise(executor);
new ReactivePromise(executor);

// equal
new ReactivePromise(executor, [1, {a:1}])
new ReactivePromise(executor, [1, {a:1}])

// non-equal
new ReactivePromise(executor, [1, {a:1}])
new ReactivePromise(executor, [2, {a:2, b:3}])

// non-equal (executors are compared with identity operator)
new ReactivePromise(function(resolve, reject) {}, [1, {a:1}])
new ReactivePromise(function(resolve, reject) {}, [1, {a:1}])
```

ReactivePromise static method `createFactory` is helpful for creating equal ReactivePromises.

```javascript
var createReactivePromise = ReactivePromise.createFactory(executor);

// it will create equal ReactivePromises
createReactivePromise(1, 2, {a:1});
createReactivePromise(1, 2, {a:1});
```

Reactive-promises passed in an object will also be smart resolved. 
```javascript

var createReactivePromise = ReactivePromise.createFactory(
    function(resolve, reject) {
        console.log('create nested reactive-promise');
        resolve(1);
    }
);

var reactivePromise = new ReactivePromise(function(resolve, reject) {
    resolve({
        a: createReactivePromise(1),
        b: createReactivePromise(1, 2),
        c: createReactivePromise(1, 2, 3)
    });

    setTimeout(function() {
        resolve({
            a: createReactivePromise(1),
            b: createReactivePromise(2, 3)
        });
    }, 1000);
});

reactivePromise.next(console.log, console.error); 

// reactive-promise indexed with 'a' key will be reused
```

### Known limitations

You should not resolve chained reactive-promises, i.e. 

```javascript
var reactivePromise = new ReactivePromise(function(resolve, reject) {
    resolve(createReactivePromise().next(/* ... */));

    setTimeout(function() {
        resolve(createReactivePromise().next(/* ... */));
    });
});
```

Smart resolving cannot be applied in this situation, i.e. reactive-promise returned by `createReactivePromise` won't be
reused and moreover, it won't cancel former one, so you may end up with two equal reactive-promises running at the same
time.  
For now just avoid resolving chained reactive-promises. Hopefully, this limitation will be removed in next release. 
