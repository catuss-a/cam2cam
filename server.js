var fs = require('fs');

// create the http server and listen on port
var server = require('http').createServer(function(req, res) {
    fs.readFile('./test.html', 'utf-8', function(error, content) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(content);
    });
});

var app = server.listen(1337, function() {
    console.log((new Date()) + " Server is listening on port 1337");
});

// create the socket server on the port
var io = require('socket.io').listen(app);

// This callback function is called every time a socket
// tries to connect to the server
io.sockets.on('connection', function(socket) {

    var address = socket.handshake.address;
    console.log("New connection from " + address.address + ":" + address.port);
    console.log((new Date()) + ' Connection established.');

    // When a user send a SDP message
    // broadcast to all users in the room
    socket.on('message', function(message) {
        console.log((new Date()) + ' Received Message, broadcasting: ' + message);
        socket.broadcast.emit('message', message);
    });

    // When the user hangs up
    // broadcast bye signal to all users in the room
    socket.on('disconnect', function() {
        // close user connection
        console.log((new Date()) + " Peer disconnected.");
        socket.broadcast.emit('user disconnected');
    });

});