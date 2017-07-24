const mongoose = require('mongoose');
const Schema = mongoose.Schema;


let Message = new Schema({
	suid: {type: String, required: true}, // id of the user that sends the message
	ruid: {type: String, required: true}, // id of the user that receives the message
	body: {type: String, required: false}, // body of the message
	time: {type: Object, required: true}, // this is the time the message was sent in ms from 1900 (used with Date)
	read: {type: Boolean, required: true} // if this message was read by recipient
});

function messageCreator(suid_, ruid_) { // owner account of the message is always the first one
	// Make sure to add a chat collection for both the sender and receiver
	return mongoose.model('Message', Message, `${suid_}${ruid_}`); // Collection is the concatenation of both suid and ruid
}

module.exports = messageCreator; // creates a Message model, with the concatenation of collections

/*
Mongoose#model(name, [schema], [collection], [skipInit])

name <String, Function> model name or class extending Model
[schema] <Schema>
[collection] <String> name (optional, inferred from model name)
[skipInit] <Boolean> whether to skip initialization (defaults to false)

// const Message = require('./schemas/message.js');
*/