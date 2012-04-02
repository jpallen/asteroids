define(function() {
    var State = function() {
        this.objects = {};

        this.nextId = 0;

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

            var shipIds     = [];
            var asteroidIds = [];
            var bulletIds   = [];
            var deleteObjectIds = [];

            // Update object's positions and velocities
            for (id in this.objects) {
                var object = this.objects[id];

                if (object.type == "ship") {
                    shipIds.push(id);
                }
                if (object.type == "asteroid") {
                    asteroidIds.push(id);
                }
                if (object.type == "bullet") {
                    bulletIds.push(id);
                    
                    // Bullets live for 10 seconds
                    if ((new Date() - object.created) / 1000.0 > 10) {
                        deleteObjectIds.push(id);
                    }
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

                        if (object.playerInput["space"]) {
                            if (!object.lastFired || (new Date() - object.lastFired) > 500) {
                                var bulletVel = 250;
                                this.objects[this.getNextId()] = {
                                    type : "bullet",
                                    position : [object.position[0], object.position[1]],
                                    velocity : [
                                        -bulletVel * Math.sin(object.rotation) + object.velocity[0],
                                        bulletVel * Math.cos(object.rotation) + object.velocity[1]
                                    ],
                                    created : new Date()
                                }

                                object.lastFired = new Date();
                            }
                        }
                    }
                   
                    if (object.type == "ship" || object.type == "asteroid") {
                        var damping = 0.3; 
                        object.acceleration[0] += - damping * object.velocity[0];
                        object.acceleration[1] += - damping * object.velocity[1];
                    }
                    
                    object.position[0] += object.velocity[0] * dt;
                    object.position[1] += object.velocity[1] * dt;

                    object.velocity[0] += object.acceleration[0] * dt;
                    object.velocity[1] += object.acceleration[1] * dt;
                }
            }


            // Do collision checking
            var shipRadius = 5;
            var asteroidRadius = 30;
            for (var i = 0; i < asteroidIds.length; i++) {
                var asteroidId = asteroidIds[i];
                var asteroid = this.objects[asteroidId];
               
                // Ships hitting asteroids
                for (var j = 0; j < shipIds.length; j++) {
                    var shipId = shipIds[j];

                    var ship = this.objects[shipId];

                    var dx = ship.position[0] - asteroid.position[0];
                    var dy = ship.position[1] - asteroid.position[1];
                    var distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < shipRadius + asteroidRadius) {
                        deleteObjectIds.push(shipId);
                    }
                }
                
                // Bullets hitting asteroids
                for (j = 0; j < bulletIds.length; j++) {
                    var bulletId = bulletIds[j];

                    var bullet = this.objects[bulletId];

                    var dx = bullet.position[0] - asteroid.position[0];
                    var dy = bullet.position[1] - asteroid.position[1];
                    var distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < asteroidRadius) {
                        deleteObjectIds.push(asteroidId);
                        deleteObjectIds.push(bulletId);
                    }
                }
            }

            for(i = 0; i < deleteObjectIds.length; i++) {
                delete this.objects[deleteObjectIds[i]];
            }
        },

        this.getNextId = function() {
            return (this.nextId += 1);
        }
    }).call(State.prototype);

    return State;
})
