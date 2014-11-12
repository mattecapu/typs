typs
========

An handy library for type validation in Javascript

What can I use it for?
---
* **Param checking**

Write a sound REST API or provide strong code constraints validating your parameters

```js
app.get('/api/v1/users/:user_id', function(req) {
	var user_id = req.params.user_id;
	if(typs(user_id).integer().positive().notZero()) throw new Error('user_id is not a valid identifier');
	// ...
});
```

* **Input validation**

Let typs handle your validation logic in an easy and semantic way

```js
var usernameType = typs().string().notEmpty().len({min: 5, max: 15});
var uniqueUsernameType = usernameType.satisifies(function(username) {
	// yes, typs supports promises!
	return query('SELECT * FROM users WHERE username = ?', username).then(function(rows) {
		return rows.length < 1;
	});
});
var passwordType = typs().string().notEmpty().len({min: 8, max: 25});
var emailType = typs().string().notEmpty().regex(/* ...a long mail regex... */);

function add_user(username, password, email) {
	if(typs(username).isnt(usernameType)) {
		throw new Error('the username you provided is not a valid username')
	}
	if(typs(password).isnt(passwordType)) {
		throw new Error('the password you provided is not valid');
	}
	if(typs(email).isnt(emailType)) {
		throw new Error('the e-mail you provided is not valid');
	}
	
	typs(username).isnt(uniqueUsernameType).then((pass) => {
		if (!pass) throw new Error('this username already exists, please pick another');
		// ...
	});
}
```

Finally
---
The library is still widely open to changes, so feel free to propose new features or open an issue.
Read the [documentation](https://github.com/mattecapu/typs/blob/master/DOCS.md) for more information.
