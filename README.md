typs
========

An handy library for type validation in Javascript

Usage
---

The library is still widely open to changes, so feel free to propose new features or open an issue.

```js
var typs = require('typs');

var foo = 5,
	bar = 'foobar',
	qux = function(q, u, x) {
		return q*u*x;
	},
	hello = {
		hello: '42',
		world: 3.1415
	};

// validate values directly
typs(foo).number().check(); 	// true
typs(bar).string().check(); 	// true
typs(qux).object().check(); 	// false
typs(hello).object().notNull(); // true

// validate multiple values at once
typs(4, 5, 6).number().check(); // true

// store types signature and use them later
var notNullType = typs().notNull();
var idType = notNullType.integer().positive().notZero();
var nameType = notNullType.string().len({min: 5, max: 20});

function create_minion(id, name) {
	if(!idType.checkOn(id)) throw new Error('not a valid ID');
	if(!nameType.checkOn(name)) throw new Error('not a valid name');
	// ...
};

create_minion(2, 'kevin');		// ok
create_minion(0, 'stuart');		// 'not a valid ID'
create_minion(15, 'dave');		// 'not a valid name'

// create complex types easily
var minionType = {
	id: idType,
	name: nameType,
	bananas: typs().notNull().integer().positive()
};
var stuartType = {
	id: minionType.id,
	name: 'stuart',
	bananas: minionType.bananas
}

function get_minion(minion) {
	if(!typs(minion).match(minionType).check()) throw new Error('not a valid minion object');
};
function is_stuart(minion) {
	return typs(minion).match(stuartType).check();
}
```
