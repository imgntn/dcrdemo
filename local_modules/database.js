 var mongoose = require("mongoose");
 var mongoUriString = process.env.MONGOLAB_URI || 'mongodb://localhost/mydb';


var CurrentMessagesSchema= mongoose.Schema({
  messages:Array
});

var currentMessages = mongoose.model('currentMessages', CurrentMessagesSchema);

var tracklistSchema=mongoose.Schema({
	author:String,
	date: { type: Date, default: Date.now },
	tracks: Array,
})

var trackSchema=mongoose.Schema({
  title:  String,
  artists: Array,
  remixBy:   String,
  date: { type: Date, default: Date.now },
  playOrder: Number,
  meta: {
    votes: Number,
    favs:  Number
  }
})


 var mongoConnection = mongoose.createConnection(
 	mongoUriString, {
 		server: {
 			poolSize: 10
 		}
 	}, function(err, res) {
 		if (err) {
 			console.log('ERROR connecting to: ' + mongoUriString + '. ' + err);
 		} else {
 			console.log('Succeeded connected to: ' + mongoUriString);

 		}
 	})

 mongoConnection.on('error', function(err) {
 	console.log('mongo err:', err)
 })