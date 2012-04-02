var Express   = require("express");
var IO        = require("socket.io");
var requirejs = require("requirejs");

var server = Express.createServer();

server.use(Express.static("client"));

server.listen(8000);

var io = IO.listen(server);

var clients = {};
var nextId = 0;


requirejs(["../client/state"], function(State) {

var state = new State();

io.sockets.on("connection", function(socket) {
    var id = (nextId += 1);
    
    socket.on("request_player", function() {
        clients[id] = socket;
        player = {
            type : "ship",
            position : [10,10],
            velocity : [0,0],
            rotation : 0,
            acceleration : [0,0]
        }

        state.objects[id] = player;

        var clientData = { 
            id : id,
            objects : {}
        }
        clientData.objects[id] = player;
        socket.emit("set_player", clientData);

        console.log("New player: " + id);
    });

    socket.on("input", function(data) {
        if (state.objects[id]) {
            state.objects[id].playerInput = data;
        }
        console.log(data);
    });

    socket.on("disconnect", function() {
       delete clients[id];
       delete state.objects[id];

       console.log("Lost player: " + id);
    })
});

var runTick = function() {
    var data = { objects : state.objects };
    for (id in clients) {
        var client = clients[id];
        client.emit("tick", data);
    }
}

var runTickAndSetTimeout = function() {
    runTick();
    setTimeout(runTickAndSetTimeout, 100);
}

runTickAndSetTimeout();

});

