let helpers = require('./helpers');

let img_hlps = {
	callbackFormatorData: function(HTTPResponse) {
		return function(status_, data_, imgContentType, error_) {
			HTTPResponse.status(status_);
			let server_response;
			if (error_) {
				HTTPResponse.setHeader('Content-Type', 'application/json');
				server_response = {success: false, data: data_, error: error_};
				setTimeout(function () {
					// safely send the request
					HTTPResponse.send(JSON.stringify(server_response));
				}, 0);
			} else if (data_ === null) {
				HTTPResponse.setHeader('Content-Type', 'application/json');
				server_response = {success: false, data: data_, error: true};
				setTimeout(function () {
					// safely send the request
					HTTPResponse.send(JSON.stringify(server_response));
				}, 0);
			} else {
				// TODO - IMPLEMENT THIS
				HTTPResponse.setHeader('Content-Type', 'image/bmp');
				HTTPResponse.contentType(imgContentType); // set the image content type
				server_response = data_;
				setTimeout(function () {
					// safely send the request
					HTTPResponse.send(server_response);
				}, 0);
			}

		};
	},
	convertImageToBmp: function(image) {
		// TODO - IMPLEMENT THIS FUNCTION
		return Buffer.from(image);
	},
	getReqContentType: function(request, tag = null){
		let contentType = helpers.sf_req(request, "content_type", tag);
		// TODO - do some safety checks, morph content type just in case OR return null which will be blocked by endpoint

		// send the final contentType
		return contentType;
	}
};

module.exports = img_hlps;