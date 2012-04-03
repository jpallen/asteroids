define(function() {
    var State = function(options) {
        this.objects = {};

        options = options || {};
        this.worldSize = options.worldSize || [500, 500];

        this.performCollisions = !!options.performCollisions;

        this.nextId = 0;

        var self = this;
        function updateStateAndSetTimeout() {
            self.updateState();
            setTimeout(updateStateAndSetTimeout, options.interval || 10);
        }
        updateStateAndSetTimeout();
    };

    (function() {
        this.clearRegions = function() {
            // Generating this array of regions is expensive so only do it once
            if (!this.regions) {
                this.regions = [];
                for (var X = 0; X < this.noOfHorizontalRegions; X++) {
                    this.regions[X] = [];
                    for (var Y = 0; Y < this.noOfVerticalRegions; Y++) {
                        this.regions[X][Y] = {
                            shipIds     : [],
                            asteroidIds : [],
                            bulletIds   : []
                        }
                    }
                }
            } else {
                for (var X = 0; X < this.noOfHorizontalRegions; X++) {
                    for (var Y = 0; Y < this.noOfVerticalRegions; Y++) {
                        this.regions[X][Y].shipIds.length     = 0;
                        this.regions[X][Y].asteroidIds.length = 0;
                        this.regions[X][Y].bulletIds.length   = 0;
                    }
                }

            }
        },

        this.updateState = function() {
            var timer = new Date();
            
            if (!this.lastTickDate) {
                this.lastTickDate = new Date();
                return;
            }

            var dt = (new Date() - this.lastTickDate) / 1000.0;
            this.lastTickDate = new Date();

            var deleteObjectIds = [];

            this.regionWidth = 300;
            this.regionHeight = 300;

            this.noOfHorizontalRegions = Math.ceil(this.worldSize[0] / this.regionWidth);
            this.noOfVerticalRegions = Math.ceil(this.worldSize[1] / this.regionHeight);

            this.clearRegions();

            var timerA = (new Date() - timer);

            // Update object's positions and velocities
            for (id in this.objects) {
                var object = this.objects[id];

                // Put it into the correct region for collision checking
                if (object.position) {
                    var X = Math.floor(object.position[0] / this.regionWidth);
                    var Y = Math.floor(object.position[1] / this.regionHeight);

                    if (object.type == "ship") {
                        this.regions[X][Y].shipIds.push(id);
                    }
                    if (object.type == "asteroid") {
                        this.regions[X][Y].asteroidIds.push(id);
                    }
                    if (object.type == "bullet") {
                        this.regions[X][Y].bulletIds.push(id);
                        
                        // Bullets live for 2 seconds
                        if ((new Date() - object.created) / 1000.0 > 2) {
                            deleteObjectIds.push(id);
                        }
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
                            object.rotation -= 8 * dt;
                        }
                        if (object.playerInput["right"]) {
                            object.rotation += 8 * dt;
                        }

                        if (object.playerInput["up"]) {
                            var rate = 250.0
                            object.acceleration = [
                                -rate * Math.sin(object.rotation),
                                rate * Math.cos(object.rotation)
                            ];
                        } else {
                            object.acceleration = [0, 0];
                        }

                        if (object.playerInput["space"]) {
                            if (!object.lastFired || (new Date() - object.lastFired) > 250) {
                                var bulletVel = 250;
                                this.objects[this.getNextId()] = {
                                    type : "bullet",
                                    position : [
                                        object.position[0],
                                        object.position[1]
                                    ],
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
                   
                    if (object.type == "ship") {
                        var damping = 0.3; 
                        object.acceleration[0] += - damping * object.velocity[0];
                        object.acceleration[1] += - damping * object.velocity[1];
                    }
                    
                    object.position[0] += object.velocity[0] * dt;
                    object.position[1] += object.velocity[1] * dt;

                    object.velocity[0] += object.acceleration[0] * dt;
                    object.velocity[1] += object.acceleration[1] * dt;

                    if (object.position[0] > this.worldSize[0]) {
                        object.position[0] = object.position[0] - this.worldSize[0];
                    }
                    if (object.position[0] < 0) {
                        object.position[0] = this.worldSize[0] + object.position[0];
                    }
                    if (object.position[1] > this.worldSize[1]) {
                        object.position[1] = object.position[1] - this.worldSize[1];
                    }
                    if (object.position[1] < 0) {
                        object.position[1] = this.worldSize[1] + object.position[1];
                    }
                }
            }

            var timerB = (new Date() - timer);


            // Do collision checking
            if (this.performCollisions) {
                var shipRadius = 5;
                for (var X = 0; X < this.noOfHorizontalRegions; X++) {
                for (var Y = 0; Y < this.noOfVerticalRegions; Y++) {
                    var asteroidIds = this.regions[X][Y].asteroidIds;
                    var bulletIds   = this.regions[X][Y].bulletIds;
                    var shipIds     = this.regions[X][Y].shipIds;

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
                            if (distance < (shipRadius + asteroid.radius)) {
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

                            if (distance < asteroid.radius) {
                                deleteObjectIds.push(asteroidId);
                                deleteObjectIds.push(bulletId);

                                // Create two smaller asteroids
                                if (asteroid.radius > 8) {
                                    // Separate orthogonal to bullet impact normal.
                                    var asteroid1 = this.objects[this.getNextId()] = {
                                        radius : asteroid.radius / 2,
                                        position : [
                                            asteroid.position[0] + dy,
                                            asteroid.position[1] - dx
                                        ],
                                        velocity : [
                                            asteroid.velocity[0] + (bullet.velocity[0] / 5) + dy / 2,
                                            asteroid.velocity[1] + (bullet.velocity[1] / 5) - dx / 2
                                        ],
                                        type : "asteroid"
                                    }
                                    var asteroid2 = this.objects[this.getNextId()] = {
                                        radius : asteroid.radius / 2,
                                        position : [
                                            asteroid.position[0] - dy / 2,
                                            asteroid.position[1] + dx / 2
                                        ],
                                        velocity : [
                                            asteroid.velocity[0] + bullet.velocity[0] / 5 - dy,
                                            asteroid.velocity[1] + bullet.velocity[1] / 5 + dx
                                        ],
                                        type : "asteroid"
                                    }
                                }
                            }
                        }
                    }

                    for(i = 0; i < shipIds.length; i++) {
                        var shipId = shipIds[i];
                        var ship = this.objects[shipId];

                        for (j = 0; j < bulletIds.length; j++) {
                            var bulletId = bulletIds[j];

                            var bullet = this.objects[bulletId];

                            var dx = ship.position[0] - bullet.position[0];
                            var dy = ship.position[1] - bullet.position[1];
                            var distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance < shipRadius && (new Date() - bullet.created) > 200) {
                                deleteObjectIds.push(shipId);
                            }
                        }
                        
                    }
                }}
            }

            var timerC = (new Date() - timer);

            console.log(timerA, timerB, timerA);

            // Remove any objects marked for deletion
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
