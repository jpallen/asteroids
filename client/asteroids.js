require(["state"], function(State) {
    game = {};

    var Input = function() {
        var keys = {
            32 : "space",
            37 : "left",
            38 : "up",
            39 : "right"
        };

        var usedKeys = [32, 37, 38, 39]

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
            self.updateObjectsFromServer(data.objects, false);
            game.state.objects[data.id].playerInput = game.input.pressedKeys;
        })
    };

    (function() {
        this.resetStateFromServer = function(data) {
            this.updateObjectsFromServer(data.objects, true);
        };

        this.updateObjectsFromServer = function(objects, removeUnmentioned) {
            var clientObjects = game.state.objects;
            var serverObjects = objects;

            for (objectId in objects) {
                if (!clientObjects[objectId]) {
                    clientObjects[objectId] = {}
                }

                clientObjects[objectId].position = serverObjects[objectId].position;
                clientObjects[objectId].velocity = serverObjects[objectId].velocity;
                clientObjects[objectId].rotation = serverObjects[objectId].rotation;
                clientObjects[objectId].type     = serverObjects[objectId].type;
            }

            if (removeUnmentioned) {
                for (objectId in clientObjects) {
                    if (typeof serverObjects[objectId] === "undefined") {
                        delete clientObjects[objectId];

                        if (objectId == game.playerId) {
                            delete game.playerId;
                        }
                    }
                }
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
        this.el = document.getElementById("play_area")
        this.canvas = this.el.getContext("2d");

        var self = this;
        window.addEventListener("resize", function() {
            self.resize();
        })
        this.resize();

        function renderAndSetTimeout() {
            self.render();
            setTimeout(renderAndSetTimeout, 10);
        }

        renderAndSetTimeout();
    };

    (function() {
        this.render = function() {
            this.clear();
            
            if (!this.lastRenderDate) {
                this.lastRenderDate = new Date();
                return;
            }

            var dt = (new Date() - this.lastRenderDate) / 1000.0;
            this.lastRenderDate = new Date();

            if (game.playerId && game.state.objects[game.playerId]) {
                if (!this.playerSetViewPort) {
                    this.viewPortCenter = game.state.objects[game.playerId].position;
                    this.playerSetViewPort = true;
                }

                // Track player when they get close to the edge
                var player = game.state.objects[game.playerId];
                var startMoving = 300;
                var boundary    = 100;
                if ((player.position[0] - this.viewPortCenter[0] > (this.el.width / 2 - startMoving) ) && player.velocity[0] > 0) {
                    var distanceFromBoundary = this.el.width / 2 - (player.position[0] - this.viewPortCenter[0]) - boundary;
                    var rate = 1 - distanceFromBoundary / (startMoving - boundary);
                    this.viewPortCenter[0] += rate * player.velocity[0] * dt;
                }
                if ((- player.position[0] + this.viewPortCenter[0] > (this.el.width / 2 - startMoving) ) && player.velocity[0] < 0) {
                    var distanceFromBoundary = this.el.width / 2 - (- player.position[0] + this.viewPortCenter[0]) - boundary;
                    var rate = 1 - distanceFromBoundary / (startMoving - boundary);
                    this.viewPortCenter[0] += rate * player.velocity[0] * dt;
                }
                if ((player.position[1] - this.viewPortCenter[1] > (this.el.height / 2 - startMoving) ) && player.velocity[1] > 0) {
                    var distanceFromBoundary = this.el.height / 2 - (player.position[1] - this.viewPortCenter[1]) - boundary;
                    var rate = 1 - distanceFromBoundary / (startMoving - boundary);
                    this.viewPortCenter[1] += rate * player.velocity[1] * dt;
                }
                if ((- player.position[1] + this.viewPortCenter[1] > (this.el.height / 2 - startMoving) ) && player.velocity[1] < 0) {
                    var distanceFromBoundary = this.el.height / 2 - (- player.position[1] + this.viewPortCenter[1]) - boundary;
                    var rate = 1 - distanceFromBoundary / (startMoving - boundary);
                    this.viewPortCenter[1] += rate * player.velocity[1] * dt;
                }
            }

            if (!this.viewPortCenter) {
                this.viewPortCenter = [0, 0];
            }

            this.canvas.save();
            this.canvas.translate(
                -(this.viewPortCenter[0] - this.el.width / 2),
                -(this.viewPortCenter[1] - this.el.height / 2)
            );
                
            for (id in game.state.objects) {
                var object = game.state.objects[id];

                if (object.position && typeof object.rotation != "undefined") {
                    if (object.type == "ship") {
                        this.drawShip(object.position,object.rotation);
                    }

                    if (object.type == "asteroid") {
                        this.drawAsteroid(object.position,object.rotation);
                    }

                    if (object.type == "bullet") {
                        this.drawBullet(object.position);
                    }
                }
            }

            this.canvas.restore();
        };

        this.clear = function() {
            this.canvas.fillStyle = "rgb(0,0,0)";
            this.canvas.fillRect(0,0,this.el.width,this.el.height);
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

        this.drawAsteroid = function(position, rotation) {
            this.canvas.save();

            this.canvas.strokeStyle = "rgb(255,255,255)";
            this.canvas.lineWidth   = 2;

            this.canvas.translate(position[0], position[1]);
            this.canvas.rotate(rotation);
            
            var offsets = [2, -1, 1, -3, 1, 2, -1, 1, -2];

            this.canvas.beginPath();
            for (i = 0; i < offsets.length; i++) {
                var r = 30 + offsets[i];
                var x = r * Math.cos(2 * Math.PI * i / offsets.length);
                var y = r * Math.sin(2 * Math.PI * i / offsets.length);

                if (i == 0)
                    this.canvas.moveTo(x,y);
                else
                    this.canvas.lineTo(x,y);
            }
            this.canvas.closePath();
            this.canvas.stroke();

            this.canvas.restore();

        };

        this.drawBullet = function(position) {
            this.canvas.save();

            this.canvas.strokeStyle = "rgb(255,255,255)";
            this.canvas.lineWidth   = 2;

            this.canvas.beginPath();
            this.canvas.arc(position[0], position[1], 1, 0, 2 * Math.PI, true);
            this.canvas.stroke();

            this.canvas.restore();
        };

        this.resize = function() {
            this.el.width = document.body.clientWidth;
            this.el.height = document.body.clientHeight;
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
