/*!
	Naive test suite
	TODO: update to Jasmine
*/

var assert = require('assert');
var Promise = require('bluebird');

var typs = require('./typs-transpiled.js');

var nan = parseFloat(''),
	infinity = 1/0;

// invariance check -> if no costraints are specified, it should always check
assert(true === typs().check());
assert(true === typs().checkOn());
assert(true === typs().is(typs()));


// promises support check
typs('shouldn\'t fail').satisfies(function(obj) {
	return Promise.resolve(true);
}).check().then((res) => {
	assert(true === res);
}).catch((error) => {
	//console.error('error', error);
	assert(false);
}).done();
typs('should fail').satisfies(function(obj) {
	return Promise.reject(obj);
}).check().then((res) => {
	assert(false);
}).catch((error) => {
	assert('should fail' === error);
}).done();


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

// typs().Null()
assert(true === typs().Null().check());
assert(true === typs(undefined).Null().check());
assert(true === typs(null).Null().check());
assert(true === typs(nan).Null().check());

assert(false === typs([]).Null().check());
assert(false === typs({}).Null().check());
assert(false === typs(() => {}).Null().check());
assert(false === typs('').Null().check());
assert(false === typs(0).Null().check());
assert(false === typs(false).Null().check());
assert(false === typs(infinity).Null().check());


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


// typs().finite()
assert(true === typs(2e30).finite().check());
assert(true === typs(-2e30).finite().check());

assert(false === typs(infinity).finite().check());
assert(false === typs(-infinity).finite().check());


// typs().infinite()
assert(true === typs(infinity).infinite().check());
assert(true === typs(-infinity).infinite().check());

assert(false === typs(2e30).infinite().check());
assert(false === typs(-2e30).infinite().check());


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


// typs().greater()
assert(true === typs(42).greater(40).check());
assert(true === typs(42).greater(-42).check());
assert(true === typs(42).greater('41').check());

assert(false === typs(42).greater(43).check());
assert(false === typs(-42).greater(42).check());
assert(false === typs(42).greater(42).check());
assert(false === typs('str').greater(42).check());

try {
	typs(42).greater();
	assert(false);
} catch(errors) {
	assert(true);
}


// typs().lesser()
assert(true === typs(40).lesser(42).check());
assert(true === typs(-42).lesser(42).check());
assert(true === typs(42).lesser('43').check());

assert(false === typs(43).lesser(42).check());
assert(false === typs(42).lesser(-42).check());
assert(false === typs(42).lesser(42).check());
assert(false === typs('str').lesser(42).check());

try {
	typs(42).lesser();
	assert(false);
} catch(errors) {
	assert(true);
}


// typs().between()
assert(true === typs(42).between({min: 40, max: 44}).check());
assert(true === typs(0).between({min: '-1', max: +1}).check());
assert(true === typs(0).between({min: 0, max: 1, includeStart: true}).check());
assert(true === typs(1).between({min: 0, max: 1, includeEnd: true}).check());
assert(true === typs(42).between({min: 42, max: 42, includeStart: true, includeEnd: true}).check());

assert(false === typs(42).between({min: 2, max: 4}).check());
assert(false === typs(42).between({min: 40, max: 42}).check());
assert(false === typs(42).between({min: 40, max: 42, includeStart: true}).check());
assert(false === typs(40).between({min: 40, max: 42, includeEnd: true}).check());

try {
	typs(40).between({min: 'error', max: 42});
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(40).between({min: 38, max: 'error'});
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(40).between({min: 38, max: 42, includeStart: 'error'});
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(40).between({min: 38, max: 42, includeEnd: 'error'});
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(40).between({min: 42, max: 38});
	assert(false);
} catch(errors) {
	assert(true);
}


// typs().bool()
assert(true === typs(true).bool().check());
assert(true === typs(false).bool().check());
assert(true === typs(new Boolean(true)).bool().check());
assert(true === typs(new Boolean(false)).bool().check());

assert(false === typs(0).bool().check());
assert(false === typs(1).bool().check());
assert(false === typs('true').bool().check());
assert(false === typs().bool().check());
assert(false === typs(nan).bool().check());
assert(false === typs([]).bool().check());


// typs().string()
assert(true === typs('').string().check());
assert(true === typs('fortytwo').string().check());
assert(true === typs(new String('hello world')).string().check());

assert(false === typs(['a', 'b', 'c']).string().check());
assert(false === typs(42).string().check());
assert(false === typs({
	toString: () => { return 'fortytwo' }
}).string().check());


// typs().regex()
var reg = /[a-z]/;

assert(true === typs('123a123').regex(reg).check());

assert(false  === typs('123123').regex(reg).check());
assert(false  === typs(['123a123']).regex(reg).check());
assert(false  === typs(123123).regex(reg).check());
assert(false  === typs().regex(reg).check());

try {
	typs('123a123').regex('error');
	assert(false);
} catch(errors) {
	assert(true);
}


// typs().array()
assert(true === typs([1, 2, 3, 4]).array().check());
assert(true === typs([]).array().check());

assert(false === typs().array().check());
assert(false === typs('array').array().check());
assert(false === typs({'0': 'hello', '1': 'world', length: 2}).array().check());


// typs().object()
assert(true === typs({}).object().check());
assert(true === typs(null).object().check());
assert(true === typs(new String('hello world')).object().check());
assert(true === typs(new Boolean(false)).object().check());

assert(false === typs().object().check());
assert(false === typs([]).object().check());
assert(false === typs('hello world').object().check());
assert(false === typs(false).object().check());


// typs().keyable()
assert(true === typs('hello world').keyable().check());
assert(true === typs('hello world'.split()).keyable().check());
assert(true === typs({a: 2, b: 3, c: 4}).keyable().check());

assert(false === typs().keyable().check());
assert(false === typs(42).keyable().check());
assert(false === typs(true).keyable().check());


// typs().hasKeys()
assert(true === typs({a: 2, b: 3, c: 4}).hasKeys([]).check());
assert(true === typs({}).hasKeys([]).check());
assert(true === typs({a: 2, b: 3, c: 4}).hasKeys(['a', 'b', 'c']).check());
assert(true === typs({a: 2, b: 3, c: 4}).hasKeys(['a', 'b']).check());

assert(false === typs({a: 2, b: 3, c: undefined}).hasKeys(['a', 'b', 'c']).check());
assert(false === typs({a: 2, b: 3}).hasKeys(['a', 'b', 'c']).check());

try {
	typs({a: 2, b: 3}).hasKeys();
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs({a: 2, b: 3}).hasKeys({a: 2, b: 3});
	assert(false);
} catch(errors) {
	assert(true);
}


var str = 'fortytwo',
	arr = str.split(''),
	obj = {'f': 1, 'o': 2, 'r': 3, 't': 4, 'y': 5, 't': 6, 'w': 7, 'o': 8, length: 8};

// typs().hasLength
assert(true === typs(str).hasLength().check());
assert(true === typs(arr).hasLength().check());
assert(true === typs(obj).hasLength().check());

assert(false === typs({a: 3, b: 4, c: 6}).hasLength().check());
assert(false === typs(3, 4, 6).hasLength().check());


// typs().len()
assert(true === typs(str, arr, obj).len({min: 2}).check());
assert(true === typs(str, arr, obj).len({max: 10}).check());
assert(true === typs(str, arr, obj).len({min: 2, max: 10}).check());
assert(true === typs(str, arr, obj).len({min: str.length}).check());
assert(true === typs(str, arr, obj).len({max: str.length}).check());
assert(true === typs(str, arr, obj).len({exact: str.length}).check());
assert(true === typs(str, arr, obj).len({min: 2, max: 10, exact: str.length}).check());
assert(true === typs(str, arr, obj).len({min: null, max: 10}).check());
assert(true === typs(str, arr, obj).len({min: 2, max: null}).check());
assert(true === typs(str, arr, obj).len({min: 2, max: 10, exact: null}).check());

assert(false === typs(str, arr, obj).len({min: 10}).check());
assert(false === typs(str, arr, obj).len({max: 2}).check());
assert(false === typs(str, arr, obj).len({min: 10, max: 20}).check());
assert(false === typs(str, arr, obj).len({exact: str.length + 1}).check());
assert(false === typs(str, arr, obj).len({min: 2, max: 10, exact: str.length + 1}).check());

try {
	typs(str, arr, obj).len({min: 'error'});
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(str, arr, obj).len({max: 'error'});
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(str, arr, obj).len({exact: 'error'});
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(str, arr, obj).len({min: 'error', max: 'error'});
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(str, arr, obj).len({min: 'error', max: 'error', exact: 'error'});
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(str, arr, obj).len({min: 10, max: 2});
	assert(false);
} catch(errors) {
	assert(true);
}


// typs().notEmpty()
assert(true === typs(str, arr, obj).notEmpty().check());
assert(true === typs({length: 5}).notEmpty().check());

assert(false === typs('').notEmpty().check());
assert(false === typs([]).notEmpty().check());
assert(false === typs({}).notEmpty().check());
assert(false === typs({length: 0}).notEmpty().check());


// typs().instanceOf()
function testType(x) {
	this.a = 2;
	this.b = 3;
	this.c = this.a + this.b + x;
};

assert(true === typs(new Object()).instanceOf(Object).check());
assert(true === typs(new String('hello world')).instanceOf(String).check());
assert(true === typs(new Boolean(false)).instanceOf(Boolean).check());
assert(true === typs(new testType(1)).instanceOf(testType).check());
assert(true === typs(new testType(1), new Boolean(false), new String('hello world')).instanceOf(Object).check());

assert(false === typs(null).instanceOf(Object).check());
assert(false === typs('hello world').instanceOf(String).check());
assert(false === typs(false).instanceOf(Boolean).check());
assert(false === typs({a: 2, b: 3, c: 6}).instanceOf(testType).check());

try {
	typs({a: 2, b: 3}).instanceOf('error');
	assert(false);
} catch(errors) {
	assert(true);
}


// typs().isType()
assert(true === typs(typs()).isType().check());
assert(true === typs(typs().integer()).isType().check());
assert(true === typs({a: typs().integer(), b: typs().string()}).isType().check());
assert(true === typs({a: typs().integer(), b: {c: typs().string(), d: typs().object()}}).isType().check());

assert(false === typs().isType().check());
assert(false === typs(typs().integer().check()).isType().check());
assert(false === typs({a: typs().integer(), b: 'error'}).isType().check());
assert(false === typs({a: typs().integer(), b: {c: typs().string(), d: 'error'}}).isType().check());


// typs().equals()
assert(true === typs().equals().check());
assert(true === typs(42).equals(42).check());
assert(true === typs('42').equals('42').check());
assert(true === typs({a: 2, b: 3}).equals({a: 2, b: 3}).check());
assert(true === typs({a: 2, b: 3}).equals({b: 3, a: 2}).check());

assert(false === typs().equals({}).check());
assert(false === typs({}).equals().check());
assert(false === typs(42).equals(43).check());
assert(false === typs('42').equals(42).check());
assert(false === typs({a: 2, b: 3, c: 4}).equals({a: 2, b: 3}).check());


// typs().func()
assert(true === typs(console.log).func().check());
assert(true === typs(() => {}).func().check());

assert(false === typs().func().check());
assert(false === typs(new Object()).func().check());
assert(false === typs('function').func().check());



console.log('so far, so good')
