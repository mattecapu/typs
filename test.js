/*!
	Naive test suite
	TODO: update to Jasmine
*/

var assert = require('assert');

var typs = require('./typs-transpiled.js');

var nan = parseFloat(''),
	infinity = 1/0;

// invariance check -> if no costraints are specified, it should always check
assert(true === typs().check());
assert(true === typs().checkOn());
assert(true === typs().is(typs()));


// typs().notNull()
assert(true === typs([]).notNull().check());
assert(true === typs({}).notNull().check());
assert(true === typs(() => {}).notNull().check());
assert(true === typs('').notNull().check());
assert(true === typs(0).notNull().check());
assert(true === typs(false).notNull().check());
assert(true === typs(infinity).notNull().check());

assert(false === typs().notNull().check());
assert(false === typs(undefined).notNull().check());
assert(false === typs(null).notNull().check());
assert(false === typs(nan).notNull().check());


// typs().number()
assert(true === typs(42).number().check());
assert(true === typs(2.7182182).number().check());
assert(true === typs('42').number().check());
assert(true === typs(0xff).number().check());

assert(false === typs().number().check());
assert(false === typs('').number().check());
assert(false === typs('42a').number().check());
assert(false === typs('fortytwo').number().check());
assert(false === typs([42]).number().check());
assert(false === typs(nan).number().check());


// typs().integer()
assert(true === typs(42).integer().check());
assert(true === typs(-42).integer().check());
assert(true === typs(42.0).integer().check());
assert(true === typs(1e-17 + 2).integer().check()); 	// 64bit numbers can't represent more than 16 digits

assert(false === typs(2.7182182).integer().check());


// typs().positive()
assert(true === typs(42).positive().check());
assert(true === typs(0).positive().check());

assert(false === typs(-42).positive().check());
assert(false === typs(-infinity).positive().check());


// typs().negative()
assert(true === typs(-42).negative().check());
assert(true === typs(-infinity).negative().check());

assert(false === typs(42).negative().check());
assert(false === typs(0).negative().check());
assert(false === typs(infinity).negative().check());


// typs().positive & typs().negative()
assert(false === typs().positive().negative().check());
assert(false === typs(0).positive().negative().check());


// typs().notZero()
assert(true === typs(42).notZero().check());
assert(true === typs(-42).notZero().check());
assert(true === typs(0.577).notZero().check());

assert(false === typs(0).notZero().check());


// typs().string()
assert(true === typs('').string().check());
assert(true === typs('fortytwo').string().check());
assert(true === typs(new String()).string().check());

assert(false === typs(['a', 'b', 'c']).string().check());

console.log('so far, so good')
