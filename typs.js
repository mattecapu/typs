/*!
	Type checking and validation tool
	Made with care by Matteo Capucci <mattecapu@live.it>
	Nerd it on GitHub: https://github.com/mattecapu/types.js
*/

import deepEqual from 'deep-equal';

const deepCompare = (a, b) => deepEqual(a, b, { strict: true });
const asArray = (obj) => [].slice.call(obj);

// factory interface to mask the immutability
const typs = (...args) => new Typs(args, []);

function wrap_and_add (constraint, transformer = (x) => x) {
	const wrapped_constraint = (objs, constraints) => {

		objs = transformer(objs);

		const next = () =>
			0 === constraints.length || constraints[0](objs, constraints.slice(1));

		let promises = [];

		const sync_result = objs.every((o) => {
			const result = constraint(o);
			if (result instanceof Promise) {
				promises.push(result);
				return true;
			} else {
				return result;
			}
		});
		const hasPromises = !!promises.length;

		if (sync_result) {
			if (hasPromises) {
				// wait for all promises to resolve
				return Promise.all(promises).then((results) => {
					if (results.some((x) => !x)) {
						return false;
					}
					return next();
				}).catch((error) => {
					throw error;
				});
			} else {
				return next();
			}
		} else {
			if (hasPromises) {
				// caller is expecting a promise, so return one
				return new Promise((res) => res(false));
			} else {
				return false;
			}
		}
	};

	// return a new object that validates with all the
	// previous constraints plus thew new one
	return new Typs(this.args, this.constraints.concat(wrapped_constraint));
};

// a class which represent a type signature
class Typs {
	constructor(args, constraints) {
		// abor empty arrays
		if (args.length === 0) args = [undefined];

		// expose as private properties
		Object.assign(this, { args, constraints });
		// expose wrap and add
		Object.assign(this, { add: wrap_and_add.bind(this) });
	}

	// checks if the arguments satisfy all the constraints of this type signature
	checkOn (...args) {
		if (0 === this.constraints.length) return true;
		return this.constraints[0](args, this.constraints.slice(1));
	}
	// checks if the objects passed to typs() satisfy this type signature
	check () {
		return this.checkOn.apply(this, this.args);
	}

	// negations of check() and checkOn()
	doesntCheckOn (obj) {
		return !this.checkOn(obj);
	}
	doesntCheck () {
		return !this.check();
	}

	// throws error if obj doesn't check
	checkOrThrow (error) {
		if (this.doesntCheck()) {
			throw error;
		}
	}
	doesntCheckOrThrow (error) {
		if (this.check()) {
			throw error;
		}
	}

	// get a function to validate using the current type
	getChecker () {
		return (obj) => this.checkOn(obj);
	}

	// get a function to assert the current type
	getAssertion (error) {
		return (obj) => typs(obj).matches(this).checkOrThrow(error);
	}

	// maps the arguments
	map (mapper) {
		if (typs(mapper).func().doesntCheck()) {
			throw new Error('typs().map() expects a function as its first parameter');
		}
		return this.add(() => true, (objs) => objs.map(mapper));
	}

	// switch the validation to items
	andEach () {
		return this.add(
			() => true,
			(objs) => {
				return objs.map((obj) => {
					if (typs(obj).hasLength().doesntCheck()) return obj;
					return asArray(obj);
				}).reduce((f, o) => f.concat(o), []);
			}
		);
	}
	// switch the validation to properties
	andEachProp () {
		return this.map((obj) => {
			if (typs(obj).object().notNil().doesntCheck()) return [obj];
			return Object.keys(obj).map((k) => obj[k]);
		}).andEach();
	}
	// switch the validation to keys
	andEachKey () {
		return this.map((obj) => {
			if (typs(obj).object().notNil().doesntCheck() && typs(obj).array().doesntCheck()) {
				throw new Error('typs().andEachKey() can\'t read keys of a non-object');
			}
			return Object.keys(obj);
		}).andEach();
	}
	// switch the validation to an array of key/values objects
	andEachEntry () {
		return this.map((obj) => {
			if (typs(obj).object().notNil().doesntCheck() && typs(obj).array().doesntCheck()) {
				throw new Error('typs().andEachEntry() can\'t read entries from a non-object');
			}
			return Object.keys(obj).map((key) => {
				return {key, value: obj[key]};
			});
		}).andEach();
	}


	// checks if obj doesn't match the specified type
	not (type) {
		return this.add((obj) => {
			return typs(obj).isnt(type);
		});
	}

	// checks if obj is null, undefined or NaN
	nil () {
		return this.add((obj) => {
			return obj === null || obj === void 0 || obj !== obj;
		});
	}
	notNil () {
		return this.not(typs().nil());
	}

	// checks if obj is undefined
	undef () {
		return this.add((obj) => {
			return obj === void 0;
		});
	}
	def () {
		return this.not(typs().undef());
	}

	// numbers
	number () {
		return this.add((obj) => {
			return (typeof obj === 'number' || obj instanceof Number) && !isNaN(obj);
		});
	}
	// number-coercible value
	numeric () {
		return this.add((obj) => {
			return typs(obj).number().check()
				|| (typs(parseFloat(obj)).number().check() && typs(obj).string().check());
		});
	}

	// checks for finiteness
	finite () {
		return this.number().add(isFinite);
	}
	// checks for infiniteness
	infinite () {
		return this.number().not(typs().finite());
	}

	// checks if obj is an integer
	integer () {
		return this.number().add((obj) => {
			return parseInt(obj) === obj
		});
	}

	// checks if obj is positive or negative
	positive () {
		return this.number().matchesAny([
			typs().equals(0),
			typs().greater(0)
		])
	}
	negative () {
		return this.number().lesser(0);
	}

	// checks if obj is 0
	zero () {
		return this.equals(0);
	}
	// checks if obj is different from 0
	notZero () {
		return this.notEquals(0);
	}

	// checks if obj is almost 0
	almostZero (eps = Number.EPSILON) {
		return this.number().between({
			min: -eps, max: eps,
			includeStart: true, includeEnd: true
		});
	}

	// checks if obj is greater than num
	greater (num) {
		if (typs(num).number().doesntCheck()) {
			throw new Error('typs().greater() expects a number as its first parameter');
		}
		return this.number().add((obj) => {
			return parseFloat(obj) > parseFloat(num);
		});
	}

	// checks if obj is lesser than num
	lesser (num) {
		if (typs(num).number().doesntCheck()) {
			throw new Error('typs().greater() expects a number as its first parameter');
		}
		return this.number().not(typs().greater(num)).notEquals(num);
	}

	// checks if obj is between min and max, using includeStart and includeEnd to specify if include the bounds
	between ({min, max, includeStart = false, includeEnd = false}) {

		let types = [];

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
	}

	// checks if obj is a boolean
	bool () {
		return this.add((obj) => {
			return typeof obj === 'boolean' || obj instanceof Boolean;
		});
	}

	// strings
	string () {
		return this.add((obj) => {
			return typeof obj === 'string' || obj instanceof String
		});
	}

	hasLength () {
		return this.matchesAny([
			typs().string(),
			typs().array(),
			typs().object().hasKeys(['length'])
		]);
	}

	// checks if obj.length respects the given constraints (good for any array-like object)
	len ({min, max, exact}) {
		const param_type = typs().notNil().integer().positive();

		if (typs(min).isnt(param_type) && typs(max).isnt(param_type) && typs(exact).isnt(param_type)) {
			throw new Error('typs().len() expects at least one parameter to be a positive integer');
		}

		min = parseInt(min);
		max = parseInt(max);
		exact = parseInt(exact);

		if (min > max) throw new Error('typs().len() expects ordered bounds');

		return this.hasLength().add((obj) => {
			return (typs(min).is(param_type) ? obj.length >= min : true)
					&& (typs(max).is(param_type) ? obj.length <= max : true)
					&& (typs(exact).is(param_type) ? obj.length === exact : true)
		});
	}

	// checks array-like objects for emptiness
	empty () {
		return this.len({exact: 0});
	}
	notEmpty () {
		return this.not(typs().empty());
	}

	// checks objects for emptiness
	hollow () {
		return this.def().andEachProp().undef();
	}
	notHollow () {
		return this.def().not(typs().hollow());
	}

	// checks if obj matches the provided regex
	regex (regex) {
		if (!typs(regex).instanceOf(RegExp)) {
			throw new Error('typs().regex() expects a RegExp object as its first parameter');
		}
		return this.string().add((obj) => {
			return regex.test(obj);
		});
	}

	// arrays
	array () {
		return this.add(Array.isArray);
	}

	// checks if a collection has any duplicate entries
	unique () {
		return this.hasLength().add((obj) => {
			return asArray(obj).every((e, i, arr) => i === arr.indexOf(e));
		});
	}

	// objects
	object () {
		return this.not(typs().array()).add((obj) => {
			return typeof obj === 'object';
		});
	}

	// returns true if accessing obj[<key>] doesn't raise an exception
	keyable () {
		return this.notNil().matchesAny([
			typs().object(),
			typs().array(),
			typs().string()
		]);
	}

	// checks if obj has all keys defined
	hasKeys (keys) {
		if (typs(keys).array().doesntCheck()) {
			throw new Error('typs().hasKeys() expects an array as its first parameter');
		}
		return this.keyable().add((obj) => {
			return keys.every((key) => key in obj);
		});
	}

	// checks if obj is an instance of the given class
	instanceOf (class_func) {
		if (typs(class_func).func().doesntCheck()) {
			throw new Error('typs().instanceOf() expects a function class as its first parameter');
		}
		return this.add((obj) => {
			return obj instanceof class_func;
		});
	}

	// checks if obj is a Typs type signature
	type () {
		return this.add((obj) => {
			if (obj instanceof Typs) return true;
			if (typs(obj).object().doesntCheck()) return false;
			return Object.keys(obj).every((key) => {
				return typs(obj[key]).type().check();
			});
		});
	}

	// checks if type matches obj
	matches (type) {
		if (typs(type).type().doesntCheck()) {
			throw new Error('typs().matches() expects a type signature object as its first parameter');
		}
		if (type instanceof Typs) {
			return this.add((obj) => {
				return type.checkOn(obj);
			});
		}
		return this.add((obj) => {
			if (typs(obj).keyable().doesntCheck()) return false;
			return Object.keys(type).every((key) => {
				if (type[key] instanceof Typs) {
					// simple type checks
					return type[key].checkOn(obj[key]);
				} else {
					// nested objects
					return typs(obj[key]).is(type[key]);
				}
			});
		});
	}

	// shortcuts for matches().check()
	is (type) {
		return this.matches(type).check();
	}
	are (type) {
		return this.is(type);
	}
	isnt (type) {
		return !this.is(type);
	}
	arent (type) {
		return this.isnt(type);
	}

	// checks if obj satisfies one or more type signatures
	matchesAny (types) {
		if (typs(types).array().doesntCheck()) {
			throw new Error('typs().matchesAny() expectes an array of types as its first parameter');
		}
		if (typs.apply(typs, types).type().doesntCheck()) {
			throw new Error('typs().matchesAny() expectes an array of types as its first parameter');
		}
		return this.add((obj) => {
			return types.some((t) => typs(obj).is(t));
		});
	}
	isAny (types) {
		return this.matchesAny(types).check();
	}

	// check type signature for all the elements of a collection
	eachMatches (type) {
		if (typs(type).type().doesntCheck()) {
			throw new Error('typs().eachMatches() expects a type as its first parameter');
		}
		return this.hasLength().andEach().matches(type);
	}

	// checks if value equals to obj
	equals (value) {
		return this.add((obj) => {
			return deepCompare(value, obj);
		});
	}
	notEquals (value) {
		return this.not(typs().equals(value));
	}

	// checks if obj is one element of domain
	oneOf (domain) {
		if (typs(domain).hasLength().doesntCheck()) {
			throw new Error('typs().oneOf() expects an iterable collection as its first parameter');
		}
		return this.add((obj) => {
			if (typeof obj === 'undefined') return false;
			return -1 !== domain.indexOf(obj);
		});
	}

	// functions
	func () {
		return this.add((obj) => {
			return typeof obj === 'function';
		});
	}

	// checks if obj satisfies the constraints defined in the function constraint(obj);
	satisfies (constraint) {
		if (typs(constraint).func().doesntCheck()) {
			throw new Error('typs().satisfies() expects a function as its first argument');
		}
		return this.add(constraint);
	}
}

export default typs;
