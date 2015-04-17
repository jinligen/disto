"use strict";
require("babelify/polyfill");

const React = require('react'),
	imm = require('immutable'),
	ImmutableRenderMixin = require('react-immutable-render-mixin');

const disto = require('../index'),
	{sto, Dis, act, mix, toObs} = disto;

window.React = React;
window.debug = require("debug");
window.debug.enable('example*');
const log = window.debug('example');

// make a new dispatcher
const dis = new Dis(),
	{fn, dispatch, register, waitfor} = dis;


// services
const services = {
	search(query, callback){	 
	  return fetch(`http://localhost:3000/list/${query}?rows=20`).then(res => callback(null, res)).catch(err => callback(err))
	},
	details(id, callback){
	  return fetch(`http://localhost:3000/product/${id}`).then(res => callback(null, res)).catch(err => callback(err))
	}		
}



// actions

// declare the constants
export const $ = act(`{
	search { done } 
	details { done } 
	select 
	backToList 
	some { nested { action1, action2 }}}`);


// now expose a bunch of actions
export const $$ = {
	// search for a string
 	search(query){
 		dispatch($.search, query);
 		services.search(query, (...args) => dispatch($.search.done, ...args))
 	},

 	select(id){ 
 		dispatch($.select, id) 
 	},

 	details(id){
 		dispatch($.details, query);
 		services.details(id, (...args) => dispatch($.details.done, ...args))
 	},

 	backToList(){
 		dispatch($.backToList)
 	}
}

// stores

const list = sto(imm.Map({loading: false, query: '', results: [], selected: false}), 
	(state, action, ...args) => {
		switch(action){
			case $.search: 
				return state.merge({selected: false, loading: true, query, error: null});

			case $.search.done: 
				const [err, res] = args;
					return (err || res.error) ? 
			      state.merge({loading:false, results: [], error: err || res.error}) :
			      state.merge({loading:false, results: imm.fromJS(res.body.data.results.products), error: null});
			 
			case $.select: 
			 	return state.merge({selected: id});
			 
			case $.backToList:
			 	return state.merge({selected: null});
			
			default: 
				return state;
		}
	});
register(list);


const details = sto({loading: false, query: '', results: [], selected: false}, 
	(state, action, ...args) => {
		switch(action){
			case $.details:
				return state.merge({loading: true, id, details:null, error: null});
			
			case $.details.done:
				const [err, res] = args;
				return (err || res.error) ? 
			      state.merge({loading:false, results: [], error: err || res.error}) :
			      state.merge({loading:false, results: imm.fromJS(res.body.data), error: null});

	}
});
register(details);


const dumbo = sto({}, (state, action) => { 
	waitfor(list, details);
	console.log('action', action+'');
	return {
		query: list().get('query'),
		id: details().get('id')
	};
});
register(dumbo);


const App = React.createClass({
	mixins:[mix],
	observe(props){
		return toObs({list, details});
	},
	render() {
		const data = this.state.data;

		return (
			<div>
				<div>{JSON.stringify(data.dumbo.toJS(), null, ' ')}</div>
				<Search {...data} /> 
			</div>			
		);
	}
});


const Search = React.createClass({
  mixins: [ImmutableRenderMixin],
  onChange(e){
    $$.search(e.target.value);
  },
  render() {
    const props = this.props,
      {list, details} = props,
      selected = list.get('selected');

    function vis(bool){
		  return bool ? {} : {display: 'none'};
		}

    return (
      <div className="Search">
        <input value={list.get('query')} onChange={this.onChange}/>
        <Results {...props} style={vis(!selected)}/>
        <Details key={details.get('id')} {...props} style={vis(!!selected)}/>        
      </div>
    );
  }
});

const Results = React.createClass({
  mixins: [ImmutableRenderMixin],
  render: function() {
    return (
      <div className="Results" style={this.props.style}>
        {this.props.list.get('results').map((item, i) => <Result product={item} key={item.get('styleid')}/>)}
      </div>
    );
  }
});

const Result = React.createClass({
  mixins: [ImmutableRenderMixin],
  onClick: function(e){
    $$.select(this.props.product.get('styleid'));
  },
  render: function() {
    return (
      <div className="Result" onClick={this.onClick} style={{width:200, display:'inline-block'}}>
        <span>{this.props.product.get('product')}</span>
        <img key={Date.now()} src={this.props.product.get('search_image')} style={{maxWidth:200}}/>      
      </div>
    );
  }
});

const Details = React.createClass({
  mixins: [ImmutableRenderMixin],
  onBack: function(){
    $$.backToList();
  },
  render: function() {
    
    return (
      <div className='Details-cnt' style={this.props.style}>
        <span style={{cursor:'pointer'}} onClick={this.onBack}>back to list page</span> 
        {this.props.details.get('loading') ? 
          <span>loading...</span> : 
          <div className="Details">
            <img src={this.props.details.getIn(['details', 'styleImages', 'default', 'imageURL'])} style={{maxWidth:200}}/>
            <span>{this.props.details.getIn(['details', 'productDisplayName'])}</span>
          </div>}
      </div>   
    );
  }
});

React.render(<App/>, document.getElementById('container'));

dis.on('action', debug);
