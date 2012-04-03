var Express   = require("express");
var IO        = require("socket.io");
var requirejs = require("requirejs");

var server = Express.createServer();

server.use(Express.static("client"));

server.listen(8000);

var io = IO.listen(server);

var clients = {};

requirejs(["../client/state"], function(State) {

var state = new State({
    performCollisions : true,
    interval          : 50
});

io.sockets.on("connection", function(socket) {
    var id = state.getNextId();
    
    socket.on("request_player", function() {
        clients[id] = socket;
        player = {
            type : "ship",
            position : [Math.random() * state.worldSize[0], Math.random() * state.worldSize[1]],
            velocity : [0,0],
            rotation : Math.PI,
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
    });

    socket.on("disconnect", function() {
       delete clients[id];
       delete state.objects[id];

       console.log("Lost player: " + id);
    })
});

var runTick = function() {
    var data = { 
        worldSize : state.worldSize,
        objects   : state.objects
    };
    for (id in clients) {
        var client = clients[id];
        client.emit("tick", data);
    }
}

var runTickAndSetTimeout = function() {
    runTick();
    setTimeout(runTickAndSetTimeout, 50);
}

runTickAndSetTimeout();

for (var i = 0; i < state.worldSize[0] * state.worldSize[1] / (300 * 300); i++) {
    state.objects[state.getNextId()] = {
        type : "asteroid",
        position : [Math.random() * state.worldSize[0], Math.random() * state.worldSize[1]],
        velocity : [Math.random() * 30, Math.random() * 30],
        radius   : 32
    }
}

});

