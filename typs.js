/*!
	Type checking and validation tool
	Made with care by Matteo Capucci <mattecapu@live.it>
	Nerd it on GitHub: https://github.com/mattecapu/types.js
*/


// a type signature object
function Typs(args, constraints) {

	if(args.length === 0) args = [undefined];

	var add = function(constraint) {
		return new Typs(args, constraints.concat(constraint));
	};

	// checks if obj satisfies all the constraints of this type signature
	this.checkOn = function(obj) {
		return (constraints.length === 0) || !constraints.some((constraint, i) => {
			return !constraint(obj);
		});
	};
	// checks if the objects passed to type() statisfy this type signature
	this.check = function() {
		return !args.some(((obj) => {
			return !this.checkOn(obj);
		}).bind(this));
	};
	
	// check if obj statisfies one or more type signatures
	this.matchAny = function(types) {
		return add((obj) => {
			return !types.some((t) => { return typs(obj).isnt(t) });
		});
	};
	this.isAny = function(types) {
		return add((obj) => {
			return typs(obj).matchAny(types).check();
		}).check();
	};

	// check if obj is null, undefined or NaN
	this.notNull = function() {
		return add((obj) => {
			return obj === false || obj === 0 || obj === '' || !!obj;
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
	this.finite = function() {
		return add((obj) => {
			return typs(obj).number().check() && isFinite(obj.toString().replace(sgn_regex, ''));
		});
	};
	// checks for infiniteness
	this.infinite = function() {
		return add((obj) => {
			return typs(obj).number().check() && !isFinite(obj.toString().replace(sgn_regex, ''));
		});
	};

	// checks if obj is an integer
	this.integer = function() {
		return add((obj) => {
			return typs(obj).number().check() && parseInt(obj) === parseFloat(obj)
		});
	};

	// checks if obj is positive or negative
	this.positive = function() {
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) >= 0;
		});
	};
	this.negative = function() {
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) < 0;
		});
	};

	// checks if obj is different from 0
	this.notZero = function() {
		return add((obj) => {
			return typs(obj).number().check() && parseFloat(obj) !== 0;
		});
	};

	// strings
	this.string = function() {
		return add((obj) => {
			return typeof obj === 'string' || obj instanceof String
		});
	};

	// checks if obj.length respects the given constraints (also good for arrays)
	this.len = function({min, max, exact}) {
		var param_type = typs().notNull().integer().positive();
		return add((obj) => {
			return (param_type.checkOn(min) ? obj.length >= min : true)
					&& (param_type.checkOn(max) ? obj.length <= max : true)
					&& (param_type.checkOn(exact) ? obj.length === exact : true)
		});
	};
	// checks string not-emptiness
	this.notEmpty = function() {
		return add((obj) => {
			return typs(obj).len({min: 1}).check();
		});
	};
	
	// checks if obj match the provided regex
	this.regex = function(regex) {
		if(!typs(regex).instanceOf(RegExp)) throw new Error('typs().regex() expects a RegExp object as its first parameter');
		return add((obj) => {
			return regex.test(obj);
		});
	};

	// arrays
	this.array = function() {
		return add(Array.isArray);
	};

	// objects
	this.object = function() {
		return add((obj) => {
			return typeof obj === 'object'
		});
	};

	// returns true if accessing obj[<key>] doesn't raise an exception
	this.keyable = function() {
		return add((obj) => {
			return typs(obj).satisfiesAny([
				typs().object(),
				typs().array(),
				typs().string()
			]);
		});
	};

	// checks if obj has all keys defined
	this.hasKeys = function(keys) {
		return add((obj) => {
			if(!typs(obj).keyable().check()) return false;
			return !keys.some((key) => {
				return !typs(obj[key]).notNull().check()
			});
		});
	};

	// checks if obj is an instance of the given class
	this.instanceOf = function(class_func) {
		if(!typs(class_func).func().check()) throw new Error('typs().instanceOf() expects a function class as its first parameter');
		return add((obj) => {
			return obj instanceof class_func;
		});
	};

	// checks if type matches obj
	this.match = function(type) {
		if(!typs(type).object().check() && !(type instanceof Typs)) {
			throw new Error('typs().match() expects a type signature object as its first parameter');
		}
		if(type instanceof Typs) {
			return add((obj) => {
				return type.checkOn(obj);
			});
		}
		return add((obj) => {
			return !Object.keys(type).some((key) => {
				if(typs(type[key]).object().check()) {
					// nested objects
					return typs(obj[key]).is(type[key]).check();
				} else if(!typs(type[key].checkOn).func().check()) {
					// same-value fields
					return typs(obj[key]).equals(type[key]).check();
				} else {
					// simple type checks
					return !type[key].checkOn(obj[key]);
				}
			});
		});
	};
	// shortcuts for match().check()
	this.is = function(type) {
		return add((obj) => {
			return typs(obj).match(type).check();
		}).check();
	};
	this.isnt = function(type) {
		return add((obj) => {
			return !typs(obj).is(type);
		}).check();
	};

	// checks if value equals to obj
	this.equals = function(value) {
		return add((obj) => {
			return value === obj;
		});
	};
	this.notEquals = function(value) {
		return add((obj) => {
			return value !== obj;
		});
	};

	// functions
	this.func = function() {
		return add((obj) => {
			return typeof obj === 'function';
		});
	};

	// checks if obj satisfies the constraints defined in the function constraint(obj);
	this.satisfies = function(constraint) {
		if(!typs(constraint).func().check()) throw new Error('typs().satisfy() expects a function as its first argument');
		return add(constraint);
	};

};

// interface, masks the immutability 
var typs = function(/* variadic arguments */) {
	return new Typs([].slice.call(arguments), []);
};

module.exports = typs;
