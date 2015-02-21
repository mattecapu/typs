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

	// let's have always something
	if (args.length === 0) args = [undefined];

	this._args = args;
	this._constraints = constraints;

	var add = (function (constraint, transformer = (x) => x) {
		let wrapped_constraint = (objs, constraints) => {

			objs = transformer(objs);

			let next = () => {
				return 0 === constraints.length ? true : constraints[0](objs, constraints.slice(1));
			};
			let promises = [];

			if(!objs.every((o) => {
				let result = constraint(o);
				if (result instanceof Promise) {
					promises.push(result);
					return true;
				} else {
					return result;
				}
			})) return false;

			if (!promises.length) return next();

			return Promise.all(promises).then((results) => {
				if(!results.every((x) => !!x)) return false;
				return next();
			}).catch((error) => {
				throw error;
			});
		}
		return new Typs(this._args, this._constraints.concat(wrapped_constraint));
	}).bind(this);

	// checks if the arguments satisfy all the constraints of this type signature
	this.checkOn = function (/*variadic*/) {
		if (0 === constraints.length) return true;
		return constraints[0]([].slice.call(arguments), this._constraints.slice(1));
	};
	// checks if the objects passed to typs() satisfy this type signature
	this.check = function () {
		return this.checkOn.apply(this, this._args);
	};

	// negations of check() and checkOn()
	this.doesntCheckOn = function (obj) {
		return !this.checkOn(obj);
	};
	this.doesntCheck = function () {
		return !this.check();
	};

	// maps the arguments
	this.map = function (mapper) {
		if (typs(mapper).func().doesntCheck()) {
			throw new Error('typs().map() expects a function as its first parameter');
		}
		return add(() => true, (objs) => objs.map(mapper));
	};

	// switch the validation to items
	this.andEach = function () {
		return add(
			() => true,
			(objs) => {
				return objs.map((obj) => {
					if (typs(obj).hasLength().doesntCheck()) return obj;
					return [].slice.call(obj);
				}).reduce((f, o) => f.concat(o), []);
			}
		);
	};
	// switch the validation to properties
	this.andEachProp = function () {
		return this.map((obj) => {
			if (typs(obj).object().notNull().doesntCheck()) return [obj];
			return Object.keys(obj).map((k) => obj[k]);
		}).andEach();
	};
	// switch the validation to keys
	this.andEachKey = function () {
		return this.map((obj) => {
			if (typs(obj).object().notNull().doesntCheck() && typs(obj).array().doesntCheck()) {
				throw new Error('typs().andEachKey() can\'t read keys of a non-object');
			}
			return Object.keys(obj);
		}).andEach();
	};
	// switch the validation to an array of key/values objects
	this.andEachMapEntry = function () {
		return this.map((obj) => {
			if (typs(obj).object().notNull().doesntCheck() && typs(obj).array().doesntCheck()) {
				throw new Error('typs().andEachMapEntry() can\'t read entries from a non-object');
			}
			return Object.keys(obj).map((key) => {
				return {key, value: obj[key]};
			});
		}).andEach();
	};


	// checks if obj doesn't match the specified type
	this.not = function (type) {
		return add((obj) => {
			return typs(obj).isnt(type);
		});
	};

	// checks if obj is null, undefined or NaN
	this.Null = function () {
		return add((obj) => {
			return obj === null || obj === void 0 || obj !== obj;
		});
	};
	this.notNull = function () {
		return this.not(typs().Null());
	};

	// checks if obj is undefined
	this.undef = function () {
		return add((obj) => {
			return obj === void 0;
		});
	};
	this.def = function () {
		return this.not(typs().undef());
	};

	// numbers
	var sgn_regex = /^-/;
	this.number = function () {
		return add((obj) => {
			return (typs(obj).string().check()
					|| typeof obj === 'number' || obj instanceof Number)
					&& !isNaN(parseFloat(obj))
					&& (isFinite(obj.toString().replace(sgn_regex, '')) || obj * obj === Infinity)
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
		if (typs(num).number().doesntCheck()) {
			throw new Error('typs().greater() expects a number as its first parameter');
		}
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) > parseFloat(num);
		});
	};

	// checks if obj is lesser than num
	this.lesser = function (num) {
		if (typs(num).number().doesntCheck()) {
			throw new Error('typs().greater() expects a number as its first parameter');
		}
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) < parseFloat(num);
		});
	};

	// checks if obj is between min and max, using includeStart and includeEnd to specify if include the bounds
	this.between = function ({min, max, includeStart = false, includeEnd = false}) {

		var types = [];

		min = parseFloat(min);
		max = parseFloat(max);

		// it doesn't duplicate the checks on lesser() and greater(),
		// but refires the exception to hide the rewiring of between()
		try {
			types.push(typs().greater(min).lesser(max));
		} catch(e) {
			throw new Error('typs().between() expects numeric bounds');
		}

		if (min > max) throw new Error('typs().between() expects ordered bounds');

		if (typs(includeStart, includeEnd).bool().doesntCheck()) {
			throw new Error('typs().between() expects includeStart and includeEnd to be booleans');
		}

		if (includeStart) types.push(typs().equals(min));
		if (includeEnd) types.push(typs().equals(max));

		return this.matchesAny(types);
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
		return this.matchesAny([
			typs().string(),
			typs().array(),
			typs().object().hasKeys(['length'])
		]);
	};

	// checks if obj.length respects the given constraints (good for any array-like object)
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
	// checks array-like objects for not-emptiness
	this.notEmpty = function () {
		return add((obj) => {
			return typs(obj).len({min: 1}).check()
					|| (typs(obj).object().check() && typs(obj.length).Null().check() && typs(Object.keys(obj)).notEmpty().check());
		});
	};

	// checks if obj matches the provided regex
	this.regex = function (regex) {
		if(!typs(regex).instanceOf(RegExp)) {
			throw new Error('typs().regex() expects a RegExp object as its first parameter');
		}
		return add((obj) => {
			return typs(obj).string().check() && regex.test(obj);
		});
	};

	// arrays
	this.array = function () {
		return add(Array.isArray);
	};

	// checks if a collection has any duplicate entries
	this.unique = function () {
		return add((obj) => {
			if (typs(obj).hasLength().doesntCheck()) return false;
			return [].slice.call(obj).every((e, i, arr) => i === arr.indexOf(e));
		});
	};

	// objects
	this.object = function () {
		return add((obj) => {
			return typs(obj).array().doesntCheck() && typeof obj === 'object';
		});
	};

	// returns true if accessing obj[<key>] doesn't raise an exception
	this.keyable = function () {
		return this.notNull().matchesAny([
			typs().object(),
			typs().array(),
			typs().string()
		]);
	};

	// checks if obj has all keys defined
	this.hasKeys = function (keys) {
		if(typs(keys).array().doesntCheck()) {
			throw new Error('typs().hasKeys() expects an array as its first parameter');
		}
		return add((obj) => {
			if(typs(obj).keyable().doesntCheck()) return false;
			return keys.every((key) => typeof obj[key] !== 'undefined');
		});
	};

	// checks if obj is an instance of the given class
	this.instanceOf = function (class_func) {
		if(typs(class_func).func().doesntCheck()) {
			throw new Error('typs().instanceOf() expects a function class as its first parameter');
		}
		return add((obj) => {
			return obj instanceof class_func;
		});
	};

	// checks if obj is a Typs type signature
	this.type = function () {
		return add((obj) => {
			if (obj instanceof Typs) return true;
			if (typs(obj).object().doesntCheck()) return false;
			return Object.keys(obj).every((key) => {
				return typs(obj[key]).type().check();
			});
		});
	};

	// checks if type matches obj
	this.matches = function (type) {
		if(typs(type).type().doesntCheck()) {
			throw new Error('typs().matches() expects a type signature object as its first parameter');
		}
		if(type instanceof Typs) {
			return add((obj) => {
				return type.checkOn(obj);
			});
		}
		return add((obj) => {
			if (typs(obj).keyable().doesntCheck()) return false;
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
		return this.matches(type).check();
	};
	this.isnt = function (type) {
		return !this.is(type);
	};
	this.are = this.is.bind(this);
	this.arent = this.isnt.bind(this);

	// checks if obj satisfies one or more type signatures
	this.matchesAny = function (types) {
		if(typs(types).array().doesntCheck()) {
			throw new Error('typs().matchesAny() expectes an array of types as its first parameter');
		}
		if(typs.apply(typs, types).type().doesntCheck()) {
			throw new Error('typs().matchesAny() expectes an array of types as its first parameter');
		}
		return add((obj) => {
			return types.some((t) => typs(obj).is(t));
		});
	};
	this.isAny = function (types) {
		return this.matchesAny(types).check();
	};

	// check type signature for all the elements of a collection
	this.eachMatches = function (type) {
		if (typs(type).type().doesntCheck()) {
			throw new Error('typs().eachMatches() expects a type as its first parameter');
		}
		return this.hasLength().andEach().matches(type);
	};

	// checks if value equals to obj
	this.equals = function (value) {
		return add((obj) => {
			return deepCompare(value, obj);
		});
	};
	this.notEquals = function (value) {
		return this.not(typs().equals(value));
	};

	// checks if obj is one element of domain
	this.oneOf = function (domain) {
		if (typs(domain).hasLength().doesntCheck()) {
			throw new Error('typs().oneOf() expects an iterable collection as its first parameter');
		}
		return add((obj) => {
			if (typeof obj === 'undefined') return false;
			return -1 !== domain.indexOf(obj);
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
		if(typs(constraint).func().doesntCheck()) {
			throw new Error('typs().satisfies() expects a function as its first argument');
		}
		return add(constraint);
	};

};
