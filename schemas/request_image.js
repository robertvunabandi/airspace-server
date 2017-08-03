const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let RequestImageBMP = new Schema({
	request_id: {type: String, required: true}, // id of the user that this notification belongs to
	url: {type: String, required: true},
	date_saved: {type: Object, required: true}
});

module.exports = mongoose.model('RequestImageBMP', RequestImageBMP, `images`); // creates a Message model, with the concatenation of collections

/*
 Mongoose#model(name, [schema], [collection], [skipInit])

 name <String, Function> model name or class extending Model
 [schema] <Schema>
 [collection] <String> name (optional, inferred from model name)
 [skipInit] <Boolean> whether to skip initialization (defaults to false)

 // const Message = require('./schemas/message.js');
 */