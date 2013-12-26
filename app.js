var port = process.env.PORT || 5000;

//for fake usernames haha
var Charlatan = require('charlatan')
Charlatan.setLocale('en-us');
var redis = require('redis');
var express = require("express.io");
var RedisStore = require('connect-redis')(express);

//unfortunately heroku does random routing with its load balancing... not sure it's possible to cluster and use sockets on heroku without more research & experimenting.
// var cluster = require('cluster');
// var numCPUs = require('os').cpus().length;
// if (cluster.isMaster) {
//   for (var i = 0; i < numCPUs; i++) {
//     cluster.fork();
//     // console.log('fork'+i)
//   }
// } else {


var app = express().http().io()
app.listen(port)


var sessionKey = process.env.SESSION_KEY

var analytics = require('analytics-node');
var analyticsSecret = process.env.SEGMENTIO_SECRET;
analytics.init({
  secret: analyticsSecret
});

var rtg = require('url').parse(process.env.REDISTOGO_URL);
// var database = require('./local_modules/database.js')


app.io.set('log level', 0);
app.io.set('browser client gzip', true);
app.io.set('browser client minification', true);
app.io.set('browser client etag', true);

app.io.set('polling duration', 10)
app.io.set("close timeout", 20);

app.use(express.cookieParser());
app.use(express.session({
  secret: process.env.CLIENT_SECRET
}));

var pub = redis.createClient(rtg.port, rtg.hostname),
  sub = redis.createClient(rtg.port, rtg.hostname),
  client = redis.createClient(rtg.port, rtg.hostname);


pub.auth(rtg.auth.split(':')[1], function(err) {
  if (err) throw err;
});
sub.auth(rtg.auth.split(':')[1], function(err) {
  if (err) throw err;
});
client.auth(rtg.auth.split(':')[1], function(err) {
  if (err) throw err;
});


app.io.set('store', new express.io.RedisStore({
  redis: redis,
  redisPub: pub,
  redisSub: sub,
  redisClient: client
}));



//seo -- disable for now while in stealth

// var seojs = require('express-seojs');
// var seoSecret=process.env.SEOJS_TOKEN;
// app.use(seojs(seoSecret));


app.use(express.methodOverride());
app.use(express.urlencoded())
app.use(express.json())
app.use(express.favicon());

app.use(express.static(__dirname + '/public'));



//ROUTES


app.get('/', function(req, res) {
  req.session.loginDate = new Date().toString()

  res.render('front', {
    title: 'Drumcode Radio',

  })
});

//templating
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');
app.engine('html', require('hbs').__express);
var hbs = require('hbs')
hbs.registerPartials(__dirname + '/views/partials');


//userlist
var uuid = require('node-uuid');
var usercount = 0;
var users = [];
var currentMessages = [
  [8, {
    chat: 'Love this track!!'
  }, 'Lavada VonRueden'],
  [7, {
    chat: 'nice build'
  }, 'Allan Grimes'],
  [6, {
    chat: 'u hear that b2b cirez d!!!'
  }, 'Jude Rodriguez'],
  [5, {
    chat: 'niiiiice'
  }, 'Selina Stokes'],
  [4, {
    chat: 'dcr!!'
  }, 'Leann Fadel'],
  [3, {
    chat: 'cant wait for the January show'
  }, 'Lonzo Cole'],
  [2, {
    chat: 'drumcode!!!'
  }, 'Candido Morar'],
  [1, {
    chat: 'that kick drum!'
  }, 'Nicklaus Conn']
];
app.io.sockets.on('connection', function(socket) {

  //make a fakename
  var username = Charlatan.Name.name();
  usercount++
  var thisuuid = uuid.v1();
  users.push(thisuuid)


  //basemessages

  //usercount 
  app.io.sockets.emit('userCount', usercount)
  app.io.sockets.emit('prepopulateChat', currentMessages)

  //chat listener
  socket.on('sendChat', function(data) {
    currentMessages.shift();
    currentMessages.push([data, username])
    // console.log('current messages:',currentMessages);

    app.io.sockets.emit('updateChat', data, username);
  });

  //disconnect listener
  socket.on('disconnect', function() {
    if (users.indexOf(thisuuid) > -1) {
      users.remove(thisuuid);
      usercount--;
    }
    //update usercount on disconnect
    app.io.sockets.emit('userCount', usercount);
  })

});

//instagram whatnot -- doing these calls clientside now.  could automate creation of subscriptions etc as below

// Instagram = require('instagram-node-lib');

// Instagram.set('client_id', process.env.INSTAGRAM_CLIENT_ID);
// Instagram.set('client_secret', process.env.INSTAGRAM_CLIENT_SECRET);
// Instagram.set('maxSockets', 5);
// Instagram.set('callback_url', 'http://drumcode.herokuapp.com/instagramCallback');
// Instagram.set('redirect_uri', 'http://drumcode.herouapp.com/');

app.get('/instagramCallback', function(req, res) {
  console.log('CALLBACK REQUEST IS:', req.url);
  console.log('CALLBACK QUERY  IS:', req.query);

  res.send(req.query['hub.challenge']);



});

app.post('/instagramCallback', function(req, res) {
  var data = req.body;
  console.log('PICTURE POST BODY:', req.body)
  data.forEach(function(tag) {
    var url = tag.object_id;
    sendMessage(url);
  });
  res.end();
});

sendMessage = function(url) {
  app.io.sockets.emit('show', {
    show: url
  });
}



// load monitoring libraries
if (process.env.NODETIME_ACCOUNT_KEY) {
  require('nodetime').profile({
    accountKey: process.env.NODETIME_ACCOUNT_KEY,
  });
}
//require('newrelic');


//utility
Array.prototype.remove = function() {
  var what, a = arguments,
    L = a.length,
    ax;
  while (L && this.length) {
    what = a[--L];
    while ((ax = this.indexOf(what)) != -1) {
      this.splice(ax, 1);
    }
  }
  return this;
}

// }