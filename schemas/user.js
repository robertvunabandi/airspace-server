const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose'); // for passwords

const User = new Schema({
	// User id's is automatically generated
	f_name: {type: String, required: true},
	l_name: {type: String, required: true},
	email: {type: String, required: true},
	dob: {type: String, required: true}, // MM-DD-YYYY, String
	description: {type: String, required: false},
	phone: {type: String, required: true}
});



// for passport saving passwords and hashing them
User.plugin(passportLocalMongoose); 

module.exports = mongoose.model('User', User, "users");

/*
Mongoose#model(name, [schema], [collection], [skipInit])

name <String, Function> model name or class extending Model
[schema] <Schema>
[collection] <String> name (optional, inferred from model name)
[skipInit] <Boolean> whether to skip initialization (defaults to false)

// const User = require('./schemas/user.js');
*/