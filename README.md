disto
---

(this api might change)

- strictly follows the original [flux](http://facebook.github.io/flux) architecture
- a simple api, with no new concepts
- leans heavily on regular functions
- stores have no setters or ajax / async calls
- shorthand notation for action creators, with async function / promise support
- [live editing experience](https://github.com/threepointone/disto-hot-loader) across action creators / stores / views
- timetravel helper
- includes mixin to polyfill [sideloading data on components](https://github.com/facebook/react/issues/3398)
- browser / server / react-native compatible, because apparently that's a thing now
- really tiny - ~2k gzipped, incl. dependencies
- [tests](https://github.com/threepointone/disto/blob/master/test/index.js), [examples](https://github.com/threepointone/disto-example) (to be fleshed out)
- i love you

`npm install disto --save`

```js
var {Dis, act} = require('disto');
// Dispatcher class, action creator helper
```

dispatcher
---

The dispatcher uses the fb dispatcher under the hood,
but the api is tweaked for our stores / actions

```js
var dispatcher = new Dis();

dispatcher.register(initialState, fn, compare)

dispatcher.unregister(store)

dispatcher.dispatch(action, ...args)

dispatcher.waitFor(...stores)
```

actions
---

Action creators can be however you choose. This is how I write them.

The action creator helper takes a dispatch function and a map of key/values,
and generates a collection of functions that, when each are called,
dispatches a unique action along with passed arguments
further calling any optional function passed in the map.

Indeed, we use the action creator *itself* as the 'actionType'
to much convenience

What this means, is that you'll likely
never have to dispatch a raw action by yourself.

Also, since these are unique objects (with readable string representations),
you also don't have to worry about global namepace clashes.

```js
var $ = act(dispatcher.dispatch, {
  init: '',   // use a blank string for default function
  a: '',
  b: function(){
    console.log('possible fire an ajax request here');
  },
  c: function(){
    // you can alias to another creator like so
    $.b();
  },
  d: function(){
    // creators can also call an optional .done() action
    // this is useful for ajax / other async operations
    setTimeout(function(){
      $.d.done('any', 'args', 'you', 'like');
    }, 500);
  }
  e: function(){
    // you can also return a Promise from an action creator,
    // and .done() gets called when it resolves
    return new Promise(function(resolve, reject){
      resolve('success!');
    });
  },
  f: async function(q){
    // you can use es7 async functions
    // and .done() will get called when it finishes
    return await fetch(`/search/${q}`);
  },
  g: async function(q){
    // finally, throwing errors / rejecting promises will call .error()
    throw new Error('disto');
  }
}, 'baconium' /* optional prefix to dev strings */);

// $.a is now a function

$.a(1, 2, 3);  // dispatches [$.a, 1, 2, 3] to all stores

console.log($.a.toString())  // baconium:~:a

$.b();  // dispatches [$.b], and then logs "possibly fire..."

$.c();  // dispatches [$.c], then [$.b], and then logs "possibly fire..."

$.d();  // dispatches [$.d], later [$.d.done, 'any', 'args', 'you', 'like']

$.e();  // dispatches [$.e], then [$.e.done, 'success!']

$.f();  // dispatches [$.f], later [$.f.done, response]

$.g();  // dispatches [$.g], then [$.g.error, Error:disto]

// these actions are consumed by stores,
// which hold all the 'state'
```

stores
---

Stores are represented as initial state + a 'reduce' function
that get called on every [actions, ...args] message
that passes through the "system".

While this might seem terse, it's a fully open system,
and you should be able to build any abstraction on top of it.

```js
var initialState = {
  q: '',
  res: [],     // initial state
  err: null
};

function reduce(state, action, ...args){
  switch(action){
    case $.query:
      let [q] = args;
      return {
        ...state, q
      };

    case $.query.done:
      let [err, res] = args;
      return {
        ...state, err, res
      };

    default:
      return state;
  }
}

var store = dispatcher.register(initialState, reduce);

store.get()   // returns current value

// you can optionally pass in a custom 'compare' function
// which decides when to trigger 'change' events
// analogous to 'shouldComponentUpdate'

// eg, with immutable-js (https://facebook.github.io/immutable-js/)
// we'd use immutable.is to compare states

var iStore = dispatcher.register(Immutable.Map({
  loading: false,
  err: null,
  results: []
}), function(o, action, ...args){
  // returns immutable structures
}, Immutable.is);

// stores are also lightweight 'observables',

store.subscribe(function(state){
  console.log('store state changed to', state);
})

// we use this to hook on to react components via the .observe() polyfill

var mix = require('disto/mix');

var Component = React.createClass({
  mixins: [mix],
  observe: function(props){
    return {a: store1, b: store2};
  },
  render: function(){
    var data = this.state.data;
    return <div>
      current value of store 1 : {data.a}
      current value of store 2 : {data.b}
    </div>;
  }
};

```

time travel!
---

(compatible with disto-hot-loader!)

```js
// run this before registering any other stores
// needs to be exactly like this to satify disto-hot

var r = require('disto/lib/record');
var rStore = dispatcher.register(r.initial, r.reduce, r.compare);
r.setup(dispatcher, rStore);

// this gives you a few helpers

var i = dispatcher.snapshot()  // takes a snapshot of current state
dispatcher.goTo(i)             // 'goes' to a particular snapshot

dispatcher.record()    // start recording
dispatcher.stop()      // stop recording
dispatcher.play()      // replay the session

```
