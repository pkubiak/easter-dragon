const HEIGHT = 600, WIDTH = 400;
const OBSTACLE_WIDTH = 100;
let STOP = false;
const GRAVITY = 900.0;
const COINS = document.createElement('img');COINS.src='src/gfx/coins.png';
const EGGS = document.createElement('img');EGGS.src='src/gfx/eggs.png';
const MOAI = document.createElement('img');MOAI.src='src/gfx/moai.png';

class Observer {
    constructor(){
        this.callbacks = {};
    }

    observe(key, fn) {
        if(!(key in this.callbacks))
            this.callbacks[key] = [];
        this.callbacks[key].push(fn);
    }

    notify(key, value) {
        if(key in this.callbacks)
            for(let fn of this.callbacks[key])
                fn(key, value);
    }
}

class Dragon {
    constructor() {
        this.x = 0;
        this.y = 300;
        this.speed = 100;
        this.vy = 200.0;
        this.hasPhysic = false;
    }

    flap() {
        this.vy = 400.0;
    }

    update(elapsed) {
        this.x += 0.001 * elapsed * this.speed;
        if(this.hasPhysic) {
            this.y -= 0.001 * elapsed * this.vy;
            this.vy -= 0.001 * elapsed * GRAVITY;
        }
    }

    draw(ctx, offset) {
        ctx.beginPath();
        ctx.fillStyle = 'purple';
        ctx.ellipse(this.x - offset, this.y, 20, 20, 0, 0, 2.0*Math.PI);
        ctx.fill();

    }
}

class Obstacle {
    constructor(x, h, orientation) {
        this.x = x;
        this.h = h;
        this.orientation = orientation;
    }

    draw(ctx, offset) {
        if(-OBSTACLE_WIDTH < this.x - offset && this.x - offset < WIDTH+OBSTACLE_WIDTH) {
            if(this.orientation == 'top') {
                ctx.fillStyle = 'black';
                ctx.fillRect(this.x - OBSTACLE_WIDTH/2 - offset, 0, OBSTACLE_WIDTH, this.h);
            } else if(this.orientation == 'down') {
                ctx.fillStyle = 'black';
                ctx.fillRect(this.x - OBSTACLE_WIDTH/2 - offset, HEIGHT - this.h, OBSTACLE_WIDTH, this.h);
            }
        }
    }

    hasCollision(x, y) {
        if(this.x - OBSTACLE_WIDTH / 2 <= x && x <= this.x + OBSTACLE_WIDTH / 2 ) {
            if(this.orientation == 'top')
                return y <= this.h;
            return y >= HEIGHT - this.h;
        }
        return false;
    }

    doCollision(world) {
        world.dragon.dead = true;
        world.o.notify('dead', true);
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.collected = false;
    }

    draw(ctx, offset, timestamp) {
        if(!this.collected) {
            let frame = Math.floor(6.0 * timestamp / 1000.0) % 6;
            ctx.drawImage(COINS, 0, frame * 41, 40, 41, this.x - offset - 20, this.y - 21, 40, 41);
        }
    }

    hasCollision(x, y){
        return Math.pow(this.x-x, 2.0)+Math.pow(this.y-y, 2.0)<Math.pow(30, 2.0);
    }

    doCollision(world) {
        if(!this.collected) {
            this.collected = true;
            world.score += 5;
            world.o.notify('score', world.score);
        }
    }
}

class Egg {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.collected = false;
        this.type = Math.floor(9 * Math.random());
    }

    draw(ctx, offset, timestamp) {
        if(!this.collected) {
            let frame = Math.floor(6.0 * timestamp / 1000.0) % 6;
            ctx.drawImage(EGGS, 96*this.type, 0, 96, 96, this.x - offset - 48, this.y - 48, 96, 96);
        }
    }

    hasCollision(x, y){
        return Math.pow(this.x-x, 2.0)+Math.pow(this.y-y, 2.0)<Math.pow(40, 2.0);
    }

    doCollision(world) {
        if(!this.collected) {
            this.collected = true;
            world.eggs += 1
            world.score += 50;
            world.o.notify('eggs', world.eggs);
            world.o.notify('score', world.score);
        }
    }
}

class Moai {
    constructor(x) {
        this.x = x;
    }

    draw(ctx, offset, timestamp) {
        ctx.drawImage(MOAI, 0, 0, 487, 600,  this.x - offset - 244, 40, 487, 600);
    }

    hasCollision() {
        return false;
    }
    doCollision(){}
}


class World {
    constructor() {
        this.items = [];
        this.score = 0; 
        this.eggs = 3; // number of lives
        this.level = 1;
        this.nextCreate = -90;
        this.prices = [];
        this.createdObstacles = 0;

        let canvas = document.querySelector('canvas');
        this.ctx = canvas.getContext('2d');
        canvas.addEventListener('click', (event) => this.dragon.flap());
        document.addEventListener('keypress', (event) => this.dragon.flap());
        this.last_timestamp;
        this.dragon = new Dragon();
        this.o = new Observer();

        this.o.observe('score', (key, value) => {
            document.querySelector('#score').innerText = (''+value).padStart(4, '0');
        });

        this.o.observe('eggs', (key, value) => {
            document.querySelector('#eggs').innerText = value;
        })

        this.o.observe('level', (key, value) => {
            document.querySelector('#level').innerText = 'Level ' + value;
        });

        this.o.notify('score', this.score);
        this.o.notify('eggs', this.eggs);
        this.o.notify('level', this.level);

        this.o.observe('dead', (key, value) => {
            if(this.eggs > 0) {
                this.eggs -= 1;
                this.o.notify('eggs', this.eggs);
                alert("You have died, but you can respawn from colorfull egg :)")
                this.reset();
            } else {
                STOP = true;
                alert("You have completely died before finding rabbit :'(")
            }
        })
    }


    createObstacle(height, hasItem, hasBonus) {
        let x = this.nextCreate + WIDTH + World.SPACING / 2;

        if(this.createdObstacles < 2*this.level) {
            this.createdObstacles += 1;
            let h = Math.floor(Math.random() * (HEIGHT - 100 - height));
            console.log('Create new at:', x, h);
            this.items.push(new Obstacle(x, h, 'top'));
            this.items.push(new Obstacle(x, HEIGHT - height - h, 'down'));
            if(hasBonus)
                this.items.push(new Egg(x, height + h - 30))
            if(hasItem)
                this.items.push(new Coin(x + World.SPACING / 2, Math.floor(Math.random()*(HEIGHT - 80)) + 40));
            this.prices.push(x + OBSTACLE_WIDTH / 2);
            this.nextCreate += World.SPACING;
        } else {
            this.items.push(new Moai(x + World.SPACING));
            this.nextCreate += 100000;

        }
    }

    reset(partial) {
        this.items = [];
        this.nextCreate = 0;
        this.dragon.x = 0;
        if(!partial) {
            this.dragon.died = false;
            this.dragon.y = 300;
            this.dragon.vy = 200.0;
            this.dragon.hasPhysic = false;
        }
        this.prices = [];
        this.createdObstacles = 0;
    }

    nextLevel() {
        this.level += 1;
        this.reset(true);
        this.o.notify('level', this.level);
    }

    update(timestamp) {
        let elapsed = timestamp - this.last_timestamp, offsetX = 0;
        if(this.last_timestamp && elapsed > 15) {
            this.dragon.update(elapsed);

            // Dragon fly bellow sea level
            if(this.dragon.y > HEIGHT) {
                this.dragon.dead = true;
                this.o.notify('dead', true);
                return true;
            }

            this.ctx.clearRect(0, 0, WIDTH, HEIGHT);

            offsetX = this.dragon.x - 90;
            if(this.prices[0] && this.dragon.x >= this.prices[0]) {
                this.prices.shift();
                this.score += 10;
                this.o.notify('score', this.score);
            }

            if(offsetX > 100)
                this.dragon.hasPhysic = true;

            // Draw all obstacles
            for(let item of this.items) {
                item.draw(this.ctx, offsetX, timestamp);
                if(item.hasCollision(this.dragon.x, this.dragon.y)) {
                    item.doCollision(this);
                }
            }
            this.dragon.draw(this.ctx, offsetX);

            // Create new obstacles
            let timeToSpawn = this.items[0] && this.items[this.items.length-1].x - offsetX < WIDTH + World.SPACING;

            if(this.nextCreate < offsetX) {
                if(offsetX < 300)
                    this.createObstacle(150, Math.random() < 0.5, Math.random() < 0.5);
                else
                    this.createObstacle(150, Math.random() < 0.25, Math.random() < 0.1);
            }

            // Remove old obstacles
            while(this.items[0] && this.items[0].x - offsetX + World.SPACING < 0) {
                console.log('Removing:', this.items[0]);
                let item = this.items.shift();
                if(item instanceof Moai) {
                    this.nextLevel();
                }
            }
        }
        this.last_timestamp = timestamp;

        return true;
    }
}
World.SPACING = 400;


function oninit() {
    console.log('oninit');

    let w = new World();
    // w.items.push(new Obstacle(500, 200, 'top'));
    // w.items.push(new Obstacle(500, 200, 'down'));
    // w.items.push(new Coin(200, 300));


    let callback = (timestamp) => {
        if(w.update(timestamp))
            window.requestAnimationFrame(callback);
    }

    window.requestAnimationFrame(callback);
}