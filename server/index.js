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
    interval          : 50,
    worldSize         : [3000, 3000]
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
    for (id in clients) {
        var client = clients[id];
        var data = { 
            worldSize : state.worldSize,
            objects   : {}
        };
       
        if (state.objects[id]) {
            var centerRegion = state.objects[id].region

            console.log(centerRegion);

            if (centerRegion && state.regions) {
                var regions = [
                    [ centerRegion[0],     centerRegion[1]     ],
                    [ centerRegion[0] - 1, centerRegion[1]     ],
                    [ centerRegion[0] - 1, centerRegion[1] - 1 ],
                    [ centerRegion[0],     centerRegion[1] - 1 ],
                    [ centerRegion[0] + 1, centerRegion[1] - 1 ],
                    [ centerRegion[0] + 1, centerRegion[1]     ],
                    [ centerRegion[0] + 1, centerRegion[1] + 1 ],
                    [ centerRegion[0],     centerRegion[1] + 1 ],
                    [ centerRegion[0] - 1, centerRegion[1] + 1 ]
                ];

                for (var i = 0; i < regions.length; i++) {
                    region = regions[i];

                    // Wrap regions is necessary
                    if (region[0] < 0) region[0] = state.noOfHorizontalRegions - 1;
                    if (region[0] > state.noOfHorizontalRegions - 1) region[0] = 0;

                    if (region[1] < 0) region[1] = state.noOfVerticalRegions - 1;
                    if (region[1] > state.noOfVerticalRegions - 1) region[1] = 0;

                    region = state.regions[region[0]][region[1]];

                    for (var j = 0; j < region.shipIds.length; j++) {
                        data.objects[region.shipIds[j]] = state.objects[region.shipIds[j]];
                    }
                    for (var j = 0; j < region.bulletIds.length; j++) {
                        data.objects[region.bulletIds[j]] = state.objects[region.bulletIds[j]];
                    }
                    for (var j = 0; j < region.asteroidIds.length; j++) {
                        data.objects[region.asteroidIds[j]] = state.objects[region.asteroidIds[j]];
                    }
                }
            }
        }

        client.emit("tick", data);
    }
}

var runTickAndSetTimeout = function() {
    runTick();
    setTimeout(runTickAndSetTimeout, 50);
}

runTickAndSetTimeout();

for (var i = 0; i < state.worldSize[0] * state.worldSize[1] / (200 * 200); i++) {
    state.objects[state.getNextId()] = {
        type : "asteroid",
        position : [Math.random() * state.worldSize[0], Math.random() * state.worldSize[1]],
        velocity : [Math.random() * 30, Math.random() * 30],
        radius   : 32
    }
}

});

