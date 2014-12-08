/*!
	Type checking and validation tool
	Made with care by Matteo Capucci <mattecapu@live.it>
	Nerd it on GitHub: https://github.com/mattecapu/types.js
*/

var Promise = require('bluebird');

// almost bullet-proof compare function
var deepCompare = require('./deepCompare.js');

// interface, masks the immutability
var typs = function (/* variadic arguments */) {
	return new Typs([].slice.call(arguments), []);
};

module.exports = typs;

// a type signature object
function Typs(args, constraints) {

	if (args.length === 0) args = [undefined];

	var add = function (constraint) {
		return new Typs(args, constraints.concat(constraint));
	};

	// checks if obj satisfies all the constraints of this type signature
	this.checkOn = function (obj) {
		if (constraints.length === 0) return true;

		var results = [];
		var async = false;
		// we use every() to shortcut on falsy values
		if (!constraints.every((constraint, i) => {
			var result = constraint(obj);
			results.push(result);

			if (result instanceof Promise) {
				async = true;
				return true;
			}
			return result;
		})) return false;

		if (!async) return true;

		// filter out already-truthy values
		return Promise.all(results.filter((result) => {
			return result instanceof Promise;
		})).then((results) => {
			return results.every((x) => x);
		}).catch((error) => {
			throw error;
		});
	};
	// checks if the objects passed to typs() satisfy this type signature
	this.check = function () {
		var current = this;
		// clever way to reuse the code above: we create a new object
		// with constraints based on args instead of the obj param
		// passed to them
		return new Typs([], args.map((arg) => {
			return (/* obj */) => {
				return current.checkOn(arg);
			};
		})).checkOn(null);
	};

	// negations of check() and checkOn()
	this.doesntCheckOn = function (obj) {
		return !this.checkOn(obj);
	};
	this.doesntCheck = function () {
		return !this.check();
	};
	
	// check type signature for all the elements of a collection
	this.eachMatches = function (type) {
		if (typs(type).type().doesntCheck()) {
			throw new Error('typs().each() expects a a type as its first parameter');
		}
		return add((obj) => {
			if (typs(obj).hasLength().doesntCheck()) return false;
			return [].slice.call(obj).every((item) => {
				return typs(item).is(type);
			});
		});
	}

	// checks if obj is null, undefined or NaN
	this.notNull = function () {
		return add((obj) => {
			return obj === false || obj === 0 || obj === '' || !!obj;
		});
	};
	this.Null = function () {
		return add((obj) => {
			return !typs(obj).notNull().check();
		});
	};

	// numbers
	var sgn_regex = /^-/;
	this.number = function () {
		return add((obj) => {
			return (typs(obj).string().check()
					|| typeof obj === 'number' || obj instanceof Number)
					&& !isNaN(parseFloat(obj))
					&& (isFinite(obj.toString().replace(sgn_regex, '')) || obj*obj === Infinity)
		});
	};

	// checks for finiteness
	this.finite = function () {
		return add((obj) => {
			return typs(obj).number().check() && isFinite(obj.toString().replace(sgn_regex, ''));
		});
	};
	// checks for infiniteness
	this.infinite = function () {
		return add((obj) => {
			return typs(obj).number().check() && !isFinite(obj.toString().replace(sgn_regex, ''));
		});
	};

	// checks if obj is an integer
	this.integer = function () {
		return add((obj) => {
			return typs(obj).number().check() && parseInt(obj) === parseFloat(obj)
		});
	};

	// checks if obj is positive or negative
	this.positive = function () {
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) >= 0;
		});
	};
	this.negative = function () {
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) < 0;
		});
	};

	// checks if obj is different from 0
	this.notZero = function () {
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) !== 0;
		});
	};

	// checks if obj is greater than num
	this.greater = function (num) {
		if (!typs(num).number().check()) throw new Error('typs().greater() expects a number as its first parameter');
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) > parseFloat(num);
		});
	};

	// checks if obj is lesser than num
	this.lesser = function (num) {
		if (!typs(num).number().check()) throw new Error('typs().greater() expects a number as its first parameter');
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) < parseFloat(num);
		});
	};

	// checks if obj is between min and max, using includeStart and includeEnd to specify if include the bounds
	this.between = function ({min, max, includeStart, includeEnd}) {

		if (includeStart === undefined) includeStart = false;
		if (includeEnd === undefined) includeEnd = false;

		if (!typs(min, max).notNull().number().check()) throw new Error('typs().between() expects numeric bounds')
		if (!typs(includeStart, includeEnd).bool().check()) throw new Error('typs().between() expects includeStart and includeEnd to be booleans')

		min = parseFloat(min);
		max = parseFloat(max);

		if (min > max) throw new Error('typs().between() expects ordered bounds');

		return add((obj) => {
			if(!typs(obj).number().check()) return false;

			var num = parseFloat(obj);

			return (min < num && num < max)
					|| (includeStart && min === num)
					|| (includeEnd && max === num);
		});
	};

	// checks if obj is a boolean
	this.bool = function () {
		return add((obj) => {
			return typeof obj === 'boolean' || obj instanceof Boolean;
		});
	};

	// strings
	this.string = function () {
		return add((obj) => {
			return typeof obj === 'string' || obj instanceof String
		});
	};

	this.hasLength = function () {
		return add((obj) => {
			return typs(obj).string().check() || typs(obj).array().check() || typs(obj).object().hasKeys(['length']).check();
		});
	};

	// checks if obj.length respects the given constraints (also good for arrays)
	this.len = function ({min, max, exact}) {
		var param_type = typs().notNull().integer().positive();

		if (typs(min).isnt(param_type) && typs(max).isnt(param_type) && typs(exact).isnt(param_type)) {
			throw new Error('typs().len() expects at least one parameter to be a positive integer');
		}

		min = parseInt(min);
		max = parseInt(max);
		exact = parseInt(exact);

		if (min > max) throw new Error('typs().len() expects ordered bounds');

		return add((obj) => {
			return typs(obj).hasLength().check()
					&& (typs(min).is(param_type) ? obj.length >= min : true)
					&& (typs(max).is(param_type) ? obj.length <= max : true)
					&& (typs(exact).is(param_type) ? obj.length === exact : true)
		});
	};
	// checks string not-emptiness
	this.notEmpty = function () {
		return add((obj) => {
			return typs(obj).len({min: 1}).check()
					|| (typs(obj).object().check() && typs(obj.length).Null().check() && typs(Object.keys(obj)).notEmpty().check());
		});
	};

	// checks if obj matches the provided regex
	this.regex = function (regex) {
		if(!typs(regex).instanceOf(RegExp)) throw new Error('typs().regex() expects a RegExp object as its first parameter');
		return add((obj) => {
			return typs(obj).string().check() && regex.test(obj);
		});
	};

	// arrays
	this.array = function () {
		return add(Array.isArray);
	};

	// objects
	this.object = function () {
		return add((obj) => {
			return !typs(obj).array().check() && typeof obj === 'object'
		});
	};

	// returns true if accessing obj[<key>] doesn't raise an exception
	this.keyable = function () {
		return add((obj) => {
			return typs(obj).matchesAny([
				typs().object(),
				typs().array(),
				typs().string()
			]).check();
		});
	};

	// checks if obj has all keys defined
	this.hasKeys = function (keys) {
		if(!typs(keys).array().check()) throw new Error('typs().keys() expects an array as its first parameter');
		return add((obj) => {
			if(!typs(obj).keyable().check()) return false;

			if(keys.length === 0) return true;
			if(keys.length === 1) return obj[keys[0]] !== undefined;
			if(typs(obj).hasKeys([keys.pop()]).check()) return typs(obj).hasKeys(keys).check();
		});
	};

	// checks if obj is an instance of the given class
	this.instanceOf = function (class_func) {
		if(!typs(class_func).func().check()) throw new Error('typs().instanceOf() expects a function class as its first parameter');
		return add((obj) => {
			return obj instanceof class_func;
		});
	};

	// checks if obj is a Typs type signature
	this.type = function () {
		return add((obj) => {
			if (obj instanceof Typs) return true;
			if (!typs(obj).object().check()) return false;
			return Object.keys(obj).every((key) => {
				return typs(obj[key]).type().check();
			});
		});
	};

	// checks if type matcheses obj
	this.matches = function (type) {
		if(!typs(type).type().check()) {
			throw new Error('typs().matches() expects a type signature object as its first parameter');
		}
		if(type instanceof Typs) {
			return add((obj) => {
				return type.checkOn(obj);
			});
		}
		return add((obj) => {
			return Object.keys(type).every((key) => {
				if(typs(type[key]).object().check()) {
					// nested objects
					return typs(obj[key]).is(type[key]);
				} else {
					// simple type checks
					return type[key].checkOn(obj[key]);
				}
			});
		});
	};
	// shortcuts for matches().check()
	this.is = function (type) {
		return add((obj) => {
			return typs(obj).matches(type).check();
		}).check();
	};
	this.isnt = function (type) {
		return add((obj) => {
			return !typs(obj).is(type);
		}).check();
	};
	// checks if obj satisfies one or more type signatures
	this.matchesAny = function (types) {
		if(!typs(types).array().check()) {
			throw new Error('typs().matchesAny() expectes an array of types as its first parameter');
		}
		if(!types.every((type) => typs(type).type().check())) {
			throw new Error('typs().matchesAny() expectes an array of types as its first parameter');
		}
		return add((obj) => {
			return types.some((t) => { return typs(obj).is(t) });
		});
	};
	this.isAny = function (types) {
		return add((obj) => {
			return typs(obj).matchesAny(types).check();
		}).check();
	};

	// checks if value equals to obj
	this.equals = function (value) {
		return add((obj) => {
			return deepCompare(value, obj);
		});
	};
	this.notEquals = function (value) {
		return add((obj) => {
			return !typs(obj).equals(value).check();
		});
	};

	// functions
	this.func = function () {
		return add((obj) => {
			return typeof obj === 'function';
		});
	};

	// checks if obj satisfies the constraints defined in the function constraint(obj);
	this.satisfies = function (constraint) {
		if(!typs(constraint).func().check()) throw new Error('typs().satisfies() expects a function as its first argument');
		return add(constraint);
	};

};
