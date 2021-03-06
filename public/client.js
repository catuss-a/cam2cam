
var socket = io.connect('http://85.170.168.11:1337');
var sourcevid = document.getElementById('webrtc-sourcevid');
var remotevid = document.getElementById('webrtc-remotevid');
var localStream = null;
var peerConn = null;
var started = false;
var channelReady = false;
var mediaConstraints = { 'mandatory': { 'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true } };
var isVideoMuted = false;

// get the local video up
function startVideo() {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
	|| window.navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL = window.URL || window.webkitURL;

    navigator.getUserMedia({video: true, audio: true}, successCallback, errorCallback);
    function successCallback(stream) {
	localStream = stream;
	if (sourcevid.mozSrcObject) {
	    sourcevid.mozSrcObject = stream;
	    sourcevid.play();
	} else {
	    try {
		sourcevid.src = window.URL.createObjectURL(stream);
		sourcevid.play();
	    } catch(e) {
		console.log("Error setting video src: ", e);
	    }
	}
    }

    function errorCallback(error) {
        console.error('An error occurred: [CODE ' + error.code + ']');
        return;
    }
}

// stop local video
function stopVideo() {
    if (sourcevid.mozSrcObject) {
	sourcevid.mozSrcObject.stop();
	sourcevid.src = null;
    } else {
	sourcevid.src = "";
	localStream.stop();
    }
}

// send SDP via socket connection
function setLocalAndSendMessage(sessionDescription) {
    peerConn.setLocalDescription(sessionDescription);
    console.log("Sending: SDP");
    console.log(sessionDescription);
    socket.json.send(sessionDescription);
}

function createOfferFailed() {
    started = false;
    console.log("Create Answer failed");
    alert("CreateOfferFailed: cannot connect to remote");
}

function connect() {
    if (!started) {
	if (localStream) {
	    if (channelReady) {
		createPeerConnection();
		started = true;
		console.log("create Offer");
		peerConn.createOffer(setLocalAndSendMessage, createOfferFailed, mediaConstraints);
	    } else {
		alert("channel not ready");
	    }
	} else {
	    alert("Local stream not running");
	}
    } else {
	alert("alreadey connected: started is true");
    }
}

function hangUp() {
    console.log("Hang up.");
    socket.json.send({type: "bye"});
    stop();
}

function stop() {
    peerConn.close();
    peerConn = null;
    started = false;
}

socket.on('connect', onChannelOpened).on('message', onMessage);
function onChannelOpened(evt) {
    console.log('Channel opened.');
    channelReady = true;
}

function createAnswerFailed() {
    console.log("Create Answer failed");
}

// socket: accept connection request
function onMessage(evt) {
    if (evt.type === 'offer') {
	console.log("Received offer...")
	if (!started) {
            createPeerConnection();
            started = true;
	}
	console.log('Creating remote session description...' );
	peerConn.setRemoteDescription(new RTCSessionDescription(evt));
	console.log('Sending answer...');
	peerConn.createAnswer(setLocalAndSendMessage, createAnswerFailed, mediaConstraints);
    } else if (evt.type === 'answer' && started) {
	console.log('Received answer...');
	console.log('Setting remote session description...' );
	peerConn.setRemoteDescription(new RTCSessionDescription(evt));
    } else if (evt.type === 'candidate' && started) {
	console.log('Received ICE candidate...');
	var candidate = new RTCIceCandidate({sdpMLineIndex:evt.sdpMLineIndex, sdpMid:evt.sdpMid,
					     candidate:evt.candidate});
	console.log(candidate);
	peerConn.addIceCandidate(candidate);
    } else if (evt.type === 'bye' && started) {
	console.log("Received bye");
	stop();
    }
}

function createPeerConnection() {
    console.log("Creating peer connection");
    RTCPeerConnection = webkitRTCPeerConnection || mozRTCPeerConnection;
    var pc_config = {"iceServers":[]};
    try {
	peerConn = new RTCPeerConnection(pc_config);
    } catch (e) {
	console.log("Failed to create PeerConnection, exception: " + e.message);
    }
    // send any ice candidates to the other peer
    peerConn.onicecandidate = function (evt) {
	if (event.candidate) {
            console.log('Sending ICE candidate...');
            console.log(evt.candidate);
            socket.json.send({type: "candidate",
                              sdpMLineIndex: evt.candidate.sdpMLineIndex,
                              sdpMid: evt.candidate.sdpMid,
                              candidate: evt.candidate.candidate});
	} else {
            console.log("End of candidates.");
	}
    };
    console.log('Adding local stream...');
    peerConn.addStream(localStream);

    peerConn.addEventListener("addstream", onRemoteStreamAdded, false);
    peerConn.addEventListener("removestream", onRemoteStreamRemoved, false)

    // when remote adds a stream, hand it on to the local video element
    function onRemoteStreamAdded(event) {
	console.log("Added remote stream");
	remotevid.src = window.URL.createObjectURL(event.stream);
    }

    // when remote removes a stream, remove it from the local video element
    function onRemoteStreamRemoved(event) {
	console.log("Remove remote stream");
	remotevid.src = "";
    }
}