
var express	= require('express');
var app		= express();
var server	= require('http').createServer(app);
var io		= require('socket.io').listen(server);

app.use(app.router)
    .use(express.static(__dirname + '/public/'))
    .get('/', function(req, res) {
	console.log(server.address());
	console.log('client co from : ' + req.connection.remoteAddress);
	res.sendfile(__dirname + '/public/index.html');
    });

// Dummy db
allSockets = [];
qmSocket = {};

io.sockets.on('connection', function(socket) {
    var address = socket.handshake.address;

    if (allSockets.length >= 1) {
	var id2 = allSockets.pop()

	qmSocket[socket.id] = id2;
	qmSocket[id2] = socket.id;
    } else {
	allSockets.push(socket.id);
    }
    console.log('New connection from [ ' + address.address + ':' + address.port + ']');
    console.log((new Date()) + ' Connection established.');

    socket.on('message', function(message) {
        console.log((new Date()) + ' Received Message, broadcasting: ' + message);
	if (qmSocket[socket.id]) {
            io.sockets.sockets[qmSocket[socket.id]].emit('message', message);
	} else {
	    console.log('This Client has no remote client');
	}
    });

    socket.on('disconnect', function() {
	if (allSockets[0] == socket) {
	    allSockets.pop();
	} else {
	    allSockets.push(qmSocket[socket.id]);
	}
        // close user connection
        console.log((new Date()) + " Peer disconnected.");
        socket.broadcast.emit('user disconnected');
    });
});

server.listen(1337, function() {
    console.log((new Date()) + " Server is listening on port 1337");
});