/*!
	Type validation tool
	TODO: refactor it with "type checker" functions
*/

var type = function() {
	return new (function(args) {

		var constraints = [];
		var add = function(constraint) {
			constraints.push(constraint);
			return this;
		};

		this.checkOn = function(obj) {
			return !constraints.some((constraint) => {
				return !constraint(obj);
			});
		};
		this.check = function() {
			return [].some.call(args, ((obj) => {
				return !this.checkOn(obj);
			}).bind(this));
		};

		// check if an object statisfies one or more type signatures
		this.satisfiesAny = function(types) {
			return !types.some((t) => { return !t.checkOn(obj) });
		};

		// check if an object is null, undefined or NaN
		this.notNull = function() {
			return add((obj) => {
				return obj === false || obj === 0 || obj !== '' || !!obj;
			});
		};

		// numbers
		var sgn_regex = /^-/;
		this.number = function () {
			return add((obj) => {
				return (type(obj).string().check()
						|| typeof obj === 'number' || obj instanceof Number)
						&& !isNaN(parseFloat(obj))
						&& isFinite(obj.toString().replace(sgn_regex, ''))
			});
		};

		this.integer = function() {
			return add((obj) => {
				return type(obj).number().check() && parseInt(obj) === parseFloat(obj)
			});
		};

		this.positive = function() {
			return add((obj) => {
				return type(obj).number().check() && parseFloat(obj) >= 0;
			});
		};
		this.negative = function() {
			return add((obj) => {
				return !type(obj).positive().check();
			});
		};

		this.notZero = function() {
			return add((obj) => {
				return type(obj).number().check() && parseFloat(obj) !== 0;
			});
		};

		//strings
		this.string = function() {
			return add((obj) => {
				return typeof obj === 'string' || obj instanceof String
			});
		};

		// (also good for arrays)
		this.len = function({min, max, exact}) {
			var param_type = type().notNull().integer().positive();
			return add((obj) => {
				return (param_type.checkOn(min) ? obj.length >= min : true)
						&& (param_type.checkOn(max) ? obj.length <= max : true)
						&& (param_type.checkOn(exact) ? obj.length === exact : true)
			});
		};
		this.notEmpty = function() {
			return add((obj) => {
				return type(obj).len({min: 1}).check();
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
		
		// returns true if accessing obj[key] doesn't raise an exception
		this.keyable = function() {
			return add((obj) => {
				return type(obj).satisfiesAny([
					type().object(), 
					type().array(),
					type().string()
				]);
			});
		};

		this.hasKeys = function(keys) {
			return add((obj) => {
				if(!type(obj).keyable().check()) return false;
				return !keys.some((key) => {
					return !type(obj[key]).notNull().check()
				});
			});
		};
		
		// check if type_object type signature matches obj
		this.match = function(type_object) {
			if(!type(type_object).object().check()) throw new Error('type().match() wants a type signature object as its first parameter');
			return add((obj) => {
				return !Object.keys(type_object).some((key) => {
					if(type(type_object[key]).object().check()) {
						//nested objects
						return type(obj[key]).match(type_object[key]).check();
					} else if(!type(type_object[key].checkOn).func().check()) {
						// same-value fields
						return type(obj[key]).equals(type_object[key]).check();
					} else {
						// simple type checks
						return !type_object[key].checkOn(obj[key]);
					}
				});
			});
		};
		
		this.equals = function(value) {
			return add((obj) => {
				return value === obj;
			});
		};
	})(arguments);
};

module.exports = type;
