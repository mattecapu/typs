/*!
	Naive test suite
*/

import assert from 'assert';
import Promise from 'bluebird';

import typs from './typs';

const nan = parseFloat('');

// no-op check -> if no costraints are specified, it should always check
assert(true === typs().check());
assert(true === typs().checkOn());
assert(true === typs().is(typs()));

assert(false === typs().doesntCheck());
assert(false === typs().doesntCheckOn());
assert(false === typs().isnt(typs()));


// promises support check
typs('shouldn\'t fail').satisfies(function (obj) {
	return Promise.resolve(true);
}).check().then((res) => {
	assert(true === res);
}).catch((error) => {
	assert(false);
});
typs('should fail').satisfies(function (obj) {
	return Promise.reject(new Error(obj));
}).check().then((res) => {
	assert(false);
}).catch((error) => {
	assert('should fail' === error.message);
});


// typs().checkOrThrow()
try {
	typs(5).number().checkOrThrow(new Error("error"));
	assert(true);
} catch (error) {
	assert(false);
}
try {
	typs('string').number().checkOrThrow(new Error("error"));
	assert(false);
} catch (error) {
	assert(true);
}

// typs().doesntCheckOrThrow()
try {
	typs(5).number().doesntCheckOrThrow(new Error("error"));
	assert(false);
} catch (error) {
	assert(true);
}
try {
	typs('string').number().doesntCheckOrThrow(new Error("error"));
	assert(true);
} catch (error) {
	assert(false);
}

// typs().getChecker()
{
	const checker = typs().number().getChecker();
	assert(true === checker(5));
	assert(false === checker('five'));
}

// typs().getAssertion()
{
	const test_error = new Error('test');
	const checker = typs().number().getAssertion(test_error);
	try {
		checker(5);
		assert(true);
	} catch (error) {
		assert(false);
	}
	try {
		checker('five');
		assert(false);
	} catch (error) {
		assert(error.message === test_error.message);
	}
}

// typs().eachMatches
assert(true === typs([1, 2, 3]).eachMatches(typs().integer().positive()).check());
assert(true === typs('ciao').eachMatches(typs().len({max: 1})).check());
assert(true === typs({'0': 'hello', '1': 'world', length: 2}).eachMatches(typs().len({exact: 5})).check());

assert(false === typs(1, 2, 3).eachMatches(typs().integer().positive()).check());
assert(false === typs(42).eachMatches(typs().greater(40)).check());
assert(false === typs({'0': 'hello', '1': 'world', length: 2}).eachMatches(typs().len({exact: 2})).check());
assert(false === typs({'0': 'hello', '1': 'world'}).eachMatches(typs().len({exact: 5})).check());

// typs().map()
assert(true === typs().map((x) => x).check());
assert(true === typs(42, 43).number().map((x) => x).number().check());
assert(true === typs('hello', 'world').string().map((x) => x).string().check());
assert(true === typs([4, 2]).array().map((x) => x).array().check());
assert(true === typs({a: 4, b: 2}).object().map((x) => x).object().check());
assert(true === typs(42).map((x) => 2 * x).equals(84).check());
assert(true === typs([4, 2]).array().andEach().map((x) => x).integer().check());
assert(true === typs([3, 5]).andEach().map((x) => 2 * x).satisfies((x) => !(x % 2)).check());
assert(true === typs(void 0).undef().map((x) => x).undef().check());

assert(false === typs(42).map((x) => x[0]).equals(42).check());
assert(false === typs([4, 2]).array().map((x) => 2*x).equals([8, 4]).check());
assert(false === typs([4, 2], 5).map((x) => x).integer().check());
assert(false === typs(void 0).undef().map((x) => x).def().check());
assert(false === typs(42).def().map((x) => x).undef().check());

// typs().andEach()
assert(true === typs().andEach().check());
assert(true === typs().undef().andEachProp().undef().check());
assert(true === typs(42).andEach().notNil().check());
assert(true === typs([1, 2, 3], [4, 5, 6]).array().andEach().integer().positive().check());
assert(true === typs([1, 2, 3], [4, 5, 6]).andEach().integer().positive().check());
assert(true === typs([1, 2, 3], {'0': 1, '1': 2, length: 2}).andEach().integer().positive().check());

assert(false === typs([1, 2, 3], [4, 5, 6]).integer().andEach().integer().positive().check());
assert(false === typs([1, 2, 3], [4, 5, 6]).andEach().integer().negative().check());
assert(false === typs([1, 2, 3], {}).andEach().integer().negative().check());

// typs().andEachProp()
assert(true === typs().andEachProp().check());
assert(true === typs().undef().andEachProp().undef().check());
assert(true === typs(42).andEachProp().notNil().check());
assert(true === typs({a: 2, b: 7, c: 17}).object().andEachProp().integer().positive().check());
assert(true === typs({a: 2, b: 7, c: 17}, {a: 32, b: 52, c: 77}).andEachProp().integer().positive().check());

assert(false === typs([1, 2, 3]).andEachProp().integer().positive().check());
assert(false === typs({a: 2, b: 7, c: 17}).integer().andEachProp().integer().positive().check());
assert(false === typs({a: 2, b: 7, c: 17}, {a: 32, b: 52, c: 77}).andEachProp().integer().negative().check());
assert(false === typs([1, 2, 3], {}).andEachProp().integer().negative().check());

// typs().andEachKey()
assert(true === typs({a: 2, b: 7, c: 17}).object().andEachKey().string().notEmpty().check());
assert(true === typs({a: 2, b: 7, c: 17}, {a: 32, b: 52, c: 77}).andEachKey().string().notEmpty().check());
assert(true === typs([-1, -2, -3]).andEachKey().map((k) => +k).integer().positive().check());
assert(true === typs([-1, -2, -3], {}).andEachKey().map((k) => +k).integer().positive().check());

assert(false === typs({a: 2, b: 7, c: 17}).andEachKey().integer().positive().check());
assert(false === typs({a: 2, b: 7, c: 17}).string().andEachKey().integer().positive().check());
assert(false === typs({a: 2, b: 7, c: 17}, {a: 32, b: 52, c: 77}).andEachKey().string().len({min: 2}).check());

try {
	typs().andEachKey().check();
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(42).andEachKey().check();
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs('hello').andEachKey().check();
	assert(false);
} catch(errors) {
	assert(true);
}

// typs().andEachEntry()
assert(true === typs([-1, -2, -3], {}).andEachEntry().object().check());
assert(true === typs([-1, -2, -3], {}).andEachEntry().object().hasKeys(['key', 'value']).check());
assert(true === typs({a: 2, b: 7, c: 17}).andEachEntry().matches({key: typs().oneOf(['a','b','c']), value: typs().integer()}).check());
assert(true === typs({a: 2, b: 7, c: 17}, {a: 32, b: 52, c: 77}).andEachEntry().matches({key: typs().oneOf(['a','b','c']), value: typs().integer()}).check());
assert(true === typs([-1, -2, -3]).andEachEntry().map((x) => +x.key).integer().positive().check());
assert(true === typs([-1, -2, -3]).andEachEntry().map((x) => x.value).integer().negative().check());

assert(false === typs({a: 2, b: 7, c: 17}).andEachEntry().integer().positive().check());
assert(false === typs({a: 2, b: 7, c: 17}).andEachEntry().string().check());
assert(false === typs({a: 2, b: 7, c: 17}).string().andEachEntry().object().check());
assert(false === typs({a: 2, b: 7, c: 17}, {a: 32, b: 52, c: 77}).andEachEntry().string().len({min: 2}).check());

try {
	typs().andEachEntry().check();
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs(42).andEachEntry().check();
	assert(false);
} catch(errors) {
	assert(true);
}
try {
	typs('hello').andEachEntry().check();
	assert(false);
} catch(errors) {
	assert(true);
}

// typs().not()
assert(true === typs(42).not(typs().string()).check());
assert(true === typs('abc').not(typs().integer()).check());


// typs().nil() && notNil()
assert(true === typs().nil().check());
assert(true === typs(undefined).nil().check());
assert(true === typs(null).nil().check());
assert(true === typs(nan).nil().check());

assert(false === typs([]).nil().check());
assert(false === typs({}).nil().check());
assert(false === typs(() => {}).nil().check());
assert(false === typs('').nil().check());
assert(false === typs(0).nil().check());
assert(false === typs(false).nil().check());
assert(false === typs(Infinity).nil().check());


// typs().undef() && def()
assert(true === typs().undef().check());
assert(true === typs(void 0).undef().check());

assert(false === typs(0).undef().check());
assert(false === typs('').undef().check());
assert(false === typs(false).undef().check());
assert(false === typs(null).undef().check());
assert(false === typs({}).undef().check());
assert(false === typs([]).undef().check());
assert(false === typs(nan).undef().check());
assert(false === typs(Infinity).undef().check());


// typs().number()
assert(true === typs(42).number().check());
assert(true === typs(2.7182182).number().check());
assert(true === typs(0xff).number().check());

assert(false === typs().number().check());
assert(false === typs('').number().check());
assert(false === typs('42').number().check());
assert(false === typs('42a').number().check());
assert(false === typs('fortytwo').number().check());
assert(false === typs([42]).number().check());
assert(false === typs(nan).number().check());

// typs().numeric()
assert(true === typs('42').numeric().check());
assert(true === typs(42).numeric().check());
assert(true === typs('42a').numeric().check());

assert(false === typs([42]).numeric().check());
assert(false === typs(nan).numeric().check());


// typs().finite() && infinite()
assert(true === typs(2e30).finite().check());
assert(true === typs(-2e30).finite().check());

assert(false === typs(Infinity).finite().check());
assert(false === typs(-Infinity).finite().check());


// typs().integer()
assert(true === typs(42).integer().check());
assert(true === typs(-42).integer().check());
assert(true === typs(42.0).integer().check());
assert(true === typs(1e-17 + 2).integer().check()); 	// 64bit numbers can't represent more than 16 digits

assert(false === typs(2.7182182).integer().check());


// typs().positive()
assert(true === typs(42).positive().check());
assert(true === typs(Infinity).positive().check());
assert(true === typs(0).positive().check());

assert(false === typs(-42).positive().check());
assert(false === typs(-Infinity).positive().check());


// typs().negative()
assert(true === typs(-42).negative().check());
assert(true === typs(-Infinity).negative().check());

assert(false === typs(42).negative().check());
assert(false === typs(0).negative().check());
assert(false === typs(Infinity).negative().check());


// typs().positive & typs().negative()
assert(false === typs().positive().negative().check());
assert(false === typs(0).positive().negative().check());


// typs().notZero()
assert(true === typs(42).notZero().check());
assert(true === typs(-42).notZero().check());
assert(true === typs(0.577).notZero().check());

assert(false === typs(0).notZero().check());


// typs().almostZero()
assert(true === typs(0).almostZero().check());
assert(true === typs(0).almostZero(5).check());
assert(true === typs(3).almostZero(5).check());
assert(true === typs(0).almostZero(0).check());

assert(false === typs(1).almostZero().check());
assert(false === typs(1).almostZero(.5).check());
assert(false === typs(Number.EPSILON).almostZero(0).check());


// typs().greater()
assert(true === typs(42).greater(40).check());
assert(true === typs(42).greater(-42).check());

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
try {
	typs(42).greater('sdfs');
	assert(false);
} catch(errors) {
	assert(true);
}


// typs().lesser()
assert(true === typs(40).lesser(42).check());
assert(true === typs(-42).lesser(42).check());

assert(false === typs(43).lesser(42).check());
assert(false === typs(42).lesser(-42).check());
assert(false === typs(42).lesser(42).check());
assert(false === typs('str').lesser(42).check());


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

// typs().unique()
assert(true === typs([]).unique().check());
assert(true === typs([1, 2, 3, 4]).unique().check());
assert(true === typs('world').unique().check());
assert(true === typs({'0': 'hello', '1': 'world', length: 2}).unique().check());

assert(false === typs().unique().check());
assert(false === typs(42).unique().check());
assert(false === typs([1, 2, 3, 3, 4]).unique().check());


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
assert(true === typs({a: 2, b: 3, c: undefined}).hasKeys(['a', 'b', 'c']).check());

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
	obj = {'f': 1, 'o': 2, 'r': 3, 't': 4, 'y': 5, 't_': 6, 'w': 7, 'o_': 8, length: 8};

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


// typs().empty() && notEmpty();
assert(true === typs('').empty().check());
assert(true === typs([]).empty().check());
assert(true === typs({length: 0}).empty().check());

assert(false === typs(str, arr, obj).empty().check());
assert(false === typs({length: 5}).empty().check());
assert(false === typs({a: 5, b: 7}).empty().check());
assert(false === typs({}).empty().check()); // not array-like

// typs().hollow() && notHollow()
assert(true === typs({}).hollow().check());

assert(false === typs().hollow().check());
assert(false === typs({length: 0}).hollow().check());
assert(false === typs({a: 5}).hollow().check());
assert(false === typs([]).hollow().check());
assert(false === typs('').hollow().check());


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


// typs().type()
assert(true === typs(typs()).type().check());
assert(true === typs(typs().integer()).type().check());
assert(true === typs({a: typs().integer(), b: typs().string()}).type().check());
assert(true === typs({a: typs().integer(), b: {c: typs().string(), d: typs().object()}}).type().check());

assert(false === typs().type().check());
assert(false === typs(typs().integer().check()).type().check());
assert(false === typs({a: typs().integer(), b: 'error'}).type().check());
assert(false === typs({a: typs().integer(), b: {c: typs().string(), d: 'error'}}).type().check());


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


// typs().oneOf()
assert(true === typs(2).oneOf([1, 2, 3]).check());

assert(false === typs().oneOf([1, 2, 3]).check());
assert(false === typs(2).oneOf([1, 3]).check());


// typs().func()
assert(true === typs(console.log).func().check());
assert(true === typs(() => {}).func().check());

assert(false === typs().func().check());
assert(false === typs(new Object()).func().check());
assert(false === typs('function').func().check());

// typs().matches() && is() && isnt() && affines
{
	const type = { a: { b: typs().number() }, c: typs().string() };
	assert(true === typs({}).isnt(type));
	assert(true === typs({a: 3, c: 5}).isnt(type));
	assert(true === typs({a: {b:5}, c: 5}).isnt(type));
	assert(true === typs({a: {b:5}, c: 'five'}).is(type));
}



console.log('so far, so good')
