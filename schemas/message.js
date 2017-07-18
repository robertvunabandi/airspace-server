const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Message = new Schema({
	suid: {type: String, required: true}, // id of the user that sends the message
	ruid: {type: String, required: true}, // id of the user that receives the message
	body: {type: String, required: true}, // ID on the key
	time: {type: Number, required: true} // this is the time the message was sent in ms from 1900 (used with Date)
});

module.exports = mongoose.model('Message', Message, "COLLECTIONAMETOFIND");

/*
Mongoose#model(name, [schema], [collection], [skipInit])

name <String, Function> model name or class extending Model
[schema] <Schema>
[collection] <String> name (optional, inferred from model name)
[skipInit] <Boolean> whether to skip initialization (defaults to false)

// const Message = require('./schemas/message.js');
*/