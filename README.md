disto
---
the shredder's js framework

another take on [flux](http://facebook.github.io/flux), influenced by observables/channels.

```js
// Here, stores are represented as reduce functions
// on every [actions, ...args] message that passes through the "system".
// You register them onto the dispatcher with an initial state, and you're good to go.

let {dispatch, register, unregister, waitFor} = new Dis();

let store = register({
  q: '',
  res: [],     // initial state
  err: null
}, (state, action, ...args) => {
  switch(action){

    case 'QUERY':
      let [q] = args;
      return {...state, q};

    case 'QUERY_DONE':
      let [err, res] = args;
      return {...state, ...(err ?
        {err, res: []} :
        {err: null, res: res.body.data})};

    default:
      return state;
  }
});

// These are observables, with the following apis

store.get()   // returns current value

let {dispose} = store.subscribe(fn)  // gets called once with initial data,
                                     // and then whenever said data changes

// notice the conspicuous lack of a .setState()

// The dispatcher uses the facebook dispatcher under the hood, with a nicer api for these stores.

unregister(store)

dispatch(action, ...args)

waitFor(...stores)

// Actions can be whatever you please.
// We include a helper to make debug friendly action collections
// It's quite funky. See the unit tests and examples for more details.

```

Also included is @gaearon's [superb take](https://gist.github.com/gaearon/7d94c9f38fdd34a6e690) on a polyfill for [side loading data](https://github.com/facebook/react/issues/3398)
```js
var App = React.createClass({
  mixins: [mix],
  observe: function(){
    return toObs({store1, store2})
  },
  render: function() {
    return (
      <div className="App">
        {this.state.data.store1}
        {this.state.data.store2}
      </div>
    );
  }
});
```

