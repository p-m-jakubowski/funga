# reactive-promise

## Overview

ReactivePromise is very similar to typical Promise.  
It differs in that, it can change its value (i.e. can be resolved multiple times).  
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

You create ReactivePromise very similar to Promise.  
Function passed to ReactivePromise (*executor*) is called asynchronously.  

```javascript
var reactivePromise = new ReactivePromise(function(resolve, reject) {
    // ...
});
```

Now you can call `resolve` as many times as you want.  

```javascript
var reactivePromise = new ReactivePromise(function(resolve, reject) {
    var counter = 0;
    setInterval(function() {
        resolve(counter);
        counter++;
    }, 1000);
});
```

But, of course, reject can be called only once.  
NOTE: ReactivePromise will be rejected if executor throws an error.

```javascript
var reactivePromise = new ReactivePromise(function(resolve, reject) {
    reject(new Error());

    setTimeout(function() {
        reject(new Error()); // <-- this will fail
    });
});
```

If you want to read reactive-promise value (or error), run its `next` method (it's ReactivePromise equivalent of Promise's `then`).  
`next` call returns another ReactivePromise, that resolves to result of value handler.  

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

<a name="cancellation" />
### Cancellation

You may return destructor, that is used when reactive-promise is cancelled or when is rejected.

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

reactivePromise.cancel();
```

NOTE: ReactivePromise will be rejected if destructor throws an error.

<a name="smart-resolving" />
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

But nested reactive-promises are resolved in a smart way.
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

What happened there? When resolve is subsequently called with equal instance of ReactivePromise 
it simply cancels latter one (before it calls its executor) and continue with already running.  

When two ReactivePromises are considered equal?
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

ReactivePromise passed in an object will also be smart resolved. 
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
    });
});

reactivePromise.next(console.log, console.error); 

// reactive-promise indexed with 'a' key will be reused
```

NOTE: currently there is no way to get equal ReactivePromise returned by `next`. 
