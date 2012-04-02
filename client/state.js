define(function() {
    var State = function() {
        this.objects = {};

        var self = this;
        function updateStateAndSetTimeout() {
            self.updateState();
            setTimeout(updateStateAndSetTimeout, 10);
        }
        updateStateAndSetTimeout();
    };

    (function() {
        this.updateState = function() {
            if (!this.lastTickDate) {
                this.lastTickDate = new Date();
                return;
            }

            var dt = (new Date() - this.lastTickDate) / 1000.0;
            this.lastTickDate = new Date();

            var shipIds = [];
            var asteroidIds = [];

            // Update object's positions and velocities
            for (id in this.objects) {
                var object = this.objects[id];

                if (object.type == "ship") {
                    shipIds.push(id);
                }
                if (object.type == "asteroid") {
                    asteroidIds.push(id);
                }

                if (object.position) {
                    if (!object.velocity)
                        object.velocity = [0, 0];
                    if (!object.acceleration)
                        object.acceleration = [0, 0];
                    if (typeof object.rotation === "undefined")
                        object.rotation = 0;

                    if (object.playerInput) {
                        if (object.playerInput["left"]) {
                            object.rotation -= 4 * dt;
                        }
                        if (object.playerInput["right"]) {
                            object.rotation += 4 * dt;
                        }

                        if (object.playerInput["up"]) {
                            var rate = 170.0
                            object.acceleration = [
                                -rate * Math.sin(object.rotation),
                                rate * Math.cos(object.rotation)
                            ];
                        } else {
                            object.acceleration = [0, 0];
                        }
                    }
                    
                    var damping = 0.3; 
                    object.acceleration[0] += - damping * object.velocity[0];
                    object.acceleration[1] += - damping * object.velocity[1];
                    
                    object.position[0] += object.velocity[0] * dt;
                    object.position[1] += object.velocity[1] * dt;

                    object.velocity[0] += object.acceleration[0] * dt;
                    object.velocity[1] += object.acceleration[1] * dt;
                }
            }


            // Do collision checking
            var shipRadius = 5;
            var asteroidRadius = 30;
            for (var i = 0; i < shipIds.length; i++) {
                for (var j = 0; j < asteroidIds.length; j++) {
                    var shipId = shipIds[i];
                    var asteroidId = asteroidIds[j];

                    var ship = this.objects[shipId];
                    var asteroid = this.objects[asteroidId];

                    var dx = ship.position[0] - asteroid.position[0];
                    var dy = ship.position[1] - asteroid.position[1];
                    var distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < shipRadius + asteroidRadius) {
                        delete this.objects[shipId];
                    }
                }
            }
        },

        this.playerInput = function(id, keysPressed) {

        }
    }).call(State.prototype);

    return State;
})
