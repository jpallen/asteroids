require(["state"], function(State) {
    game = {};

    var Input = function() {
        var keys = {
            32 : "space",
            37 : "left",
            38 : "up",
            39 : "right",
            40 : "down"
        };

        var usedKeys = [32, 37, 38, 39, 40]

        this.pressedKeys = {};

        var self = this;
        window.document.body.addEventListener("keydown", function(e) {
            if (usedKeys.indexOf(e.keyCode) != -1) {
                self.pressedKeys[keys[e.keyCode]] = true
            }

            game.network.sendInputToServer(self.pressedKeys);
        });

        document.body.addEventListener("keyup", function(e) {
            if (usedKeys.indexOf(e.keyCode) != -1) {
                self.pressedKeys[keys[e.keyCode]] = false
            }

            game.network.sendInputToServer(self.pressedKeys);
        });
    }

    var Network = function() {
        this.socket = io.connect();

        var self = this;
        this.socket.on("tick", function(data) {
            self.resetStateFromServer(data);
        })

        this.socket.on("set_player", function(data) {
            game.playerId = data.id;
            self.updateObjectsFromServer(data.objects);
            game.state.objects[data.id].playerInput = game.input.pressedKeys;
        })
    };

    (function() {
        this.resetStateFromServer = function(data) {
            this.updateObjectsFromServer(data.objects);
        };

        this.updateObjectsFromServer = function(objects) {
            for (objectId in objects) {
                if (!game.state.objects[objectId]) {
                    game.state.objects[objectId] = {}
                }

                game.state.objects[objectId].position = objects[objectId].position;
                game.state.objects[objectId].velocity = objects[objectId].velocity;
                game.state.objects[objectId].rotation = objects[objectId].rotation;
                game.state.objects[objectId].type     = objects[objectId].type;
            }
        };

        this.requestPlayer = function() {
            this.socket.emit("request_player");
        };

        this.sendInputToServer = function(input) {
            this.socket.emit("input", input);
        };
    }).call(Network.prototype);

    var Graphics = function() {
        this.canvas = document.getElementById("play_area").getContext("2d");

        var self = this;
        function renderAndSetTimeout() {
            self.render();
            setTimeout(renderAndSetTimeout, 10);
        }

        renderAndSetTimeout();
    };

    (function() {
        this.render = function() {
            this.clear();
            
            for (id in game.state.objects) {
                var object = game.state.objects[id];

                if (object.position && typeof object.rotation != "undefined") {
                    this.drawShip(
                        object.position,
                        object.rotation
                    );
                }
            }
        };

        this.clear = function() {
            this.canvas.fillStyle = "rgb(0,0,0)";
            this.canvas.fillRect(0,0,1000,1000);
        };

        this.drawShip = function(position, rotation) {
            this.canvas.save();

            this.canvas.strokeStyle = "rgb(255,255,255)";
            this.canvas.lineWidth   = 2;

            this.canvas.translate(position[0], position[1]);
            this.canvas.rotate(rotation);
            
            this.canvas.beginPath();
            this.canvas.moveTo(-5,-6);
            this.canvas.lineTo(0,9);
            this.canvas.lineTo(5,-6);
            this.canvas.closePath();
            this.canvas.stroke();

            this.canvas.restore();
        };
    }).call(Graphics.prototype);

    function initialise() {
        game.state    = new State();
        game.graphics = new Graphics();
        game.network  = new Network();
        game.input    = new Input();

        game.network.requestPlayer();
    }

    window.onload = initialise;
});
