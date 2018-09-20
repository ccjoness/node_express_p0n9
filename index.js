const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const app = express();
const server = require('https').Server(app);
const io = require('socket.io')(server);

let roomNumber = 1;
let games = {};

class Game {
    constructor(name) {

        this.created = Date.now();
        this.gameName = name;
        this.canvasData = {
            width: 480,
            height: 320
        };
        this.gameData = {
            playing: false,
            x: this.canvasData.width / 2,
            y: this.canvasData.height - 30,
            ballRadius: 10,
            dx: 1,
            dy: -1
        };
        this.game = function () {

        };
        this.player1 = {
            height: 75,
            width: 10,
            y: 37,
            up: false,
            down: false,
            speed: 2,
            name: 'None',
            score: 0,
            socketId: null
        };
        this.player2 = {
            height: 75,
            width: 10,
            y: 37,
            up: false,
            down: false,
            speed: 2,
            name: 'None',
            score: 0,
            socketId: null
        };
        this.spectators = [];

        this.isSpotOpen = function () {
            if (this.player1.name === 'None') {
                return 'Player1'
            } else if (this.player2.name === 'None') {
                return 'Player2'
            }
            return false
        };
        let n = io.of('/' + this.gameName);
        let _game = this;

        this.gameFrame = function () {
            // Player 1 paddle bounds and point check
            if (_game.gameData.x + _game.gameData.dx - _game.gameData.ballRadius < _game.player1.width) {
                if (_game.gameData.x + _game.gameData.dx - _game.gameData.ballRadius < 0) {
                    _game.player2.score += 1;
                    _game.gameData.x = _game.canvasData.width / 2;
                } else if (_game.gameData.y > _game.player1.y && _game.gameData.y < _game.player1.y + _game.player1.height && _game.gameData.dx < 0) {
                    _game.gameData.dx = -_game.gameData.dx;
                }
            }

            // Player 2 paddle bounds and point check
            if (_game.gameData.x + _game.gameData.dx + _game.gameData.ballRadius > _game.canvasData.width - _game.player2.width) {
                if (_game.gameData.x + _game.gameData.dx + _game.gameData.ballRadius > _game.canvasData.width) {
                    _game.player1.score += 1;
                    _game.gameData.x = _game.canvasData.width / 2;
                } else if (_game.gameData.y > _game.player2.y && _game.gameData.y < _game.player2.y + _game.player2.height && _game.gameData.dx > 0) {
                    _game.gameData.dx = -_game.gameData.dx;
                }
            }

            // Top and bottom bounds for ball
            if (_game.gameData.y + _game.gameData.dy + _game.gameData.ballRadius > _game.canvasData.height || _game.gameData.y + _game.gameData.dy - _game.gameData.ballRadius < 0) {
                _game.gameData.dy = -_game.gameData.dy;
            }

            // player 1 paddle movement
            if (_game.player1.up && _game.player1.y > 0) {
                _game.player1.y -= _game.player1.speed
            } else if (_game.player1.down && _game.player1.y + _game.player1.height < _game.canvasData.height) {
                _game.player1.y += _game.player1.speed
            }

            // player 1 paddle movement
            if (_game.player2.up && _game.player2.y > 0) {
                _game.player2.y -= _game.player2.speed
            } else if (_game.player2.down && _game.player2.y + _game.player2.height < _game.canvasData.height) {
                _game.player2.y += _game.player2.speed
            }

            // pauses unless there are two players TODO: fix this dumb thing
            _game.gameData.playing = _game.player1.name !== "None" && _game.player2.name !== "None";

            // Moves the ball
            if (_game.gameData.playing) {
                _game.gameData.x += _game.gameData.dx;
                _game.gameData.y += _game.gameData.dy;
            }
        };
        setInterval(this.gameFrame, 10);
        n.on('connection', function (socket) {
            socket.emit('message', {
                content: _game.gameName,
                openSpot: _game.isSpotOpen()
            });
            socket.on('player-paddle-change', function (data) {
                if (data.role === 'Player1') {
                    if (data.keyCode === 38) {
                        _game.player1.up = data.up;
                    } else if (data.keyCode === 40) {
                        _game.player1.down = data.down;
                    }
                } else if (data.role === 'Player2') {
                    if (data.keyCode === 38) {
                        _game.player2.up = data.up;
                    } else if (data.keyCode === 40) {
                        _game.player2.down = data.down;
                    }
                }
            });
            socket.on('join-game', function (data) {
                const user = socket;
                if (_game.isSpotOpen() === 'Player1') {
                    _game.player1.name = 'Player1';
                    socket.nickname = 'Player1';
                    _game.player1.socketId = socket.id;
                    user.emit('game-joined', {
                        status: 'success',
                        role: 'Player1'
                    })
                } else if (_game.isSpotOpen() === 'Player2') {
                    _game.player2.name = 'Player2';
                    socket.nickname = 'Player2';
                    user.emit('game-joined', {
                        status: 'success',
                        role: 'Player2'
                    })
                }
            });
            socket.on('disconnect', function (data) {
                if (socket.nickname === 'Player1') {
                    _game.gameData.playing = false;
                    _game.player1.name = 'None';
                    console.log('Player1 left game')
                } else if (socket.nickname === 'Player2') {
                    _game.gameData.playing = false;
                    _game.player2.name = 'None';
                    console.log('Player2 left game')
                }
            });
            setInterval(function () {
                socket.emit('game-frame', {
                    x: _game.gameData.x,
                    y: _game.gameData.y,
                    player1Y: _game.player1.y,
                    player2Y: _game.player2.y,
                    player1Name: _game.player1.name,
                    player2Name: _game.player2.name,
                    player1Score: _game.player1.score,
                    player2Score: _game.player2.score,
                })
            }, 10)
        });
    }
}

app.set('view engine', 'pug');
app.set('views', './templates');

// for parsing application/json
app.use(bodyParser.json());

// for parsing application/xwww-
app.use(bodyParser.urlencoded({extended: true}));
//form-urlencoded

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/game-(\\d+)', function (req, res) {
    res.render('game', {gameName: req.url.replace('/', '')});
});

io.on('connection', function (socket) {
    socket.emit('games_list', {
        games: games
    });

    socket.on('new_room', function (data) {
        let name = "game-" + roomNumber;
        games[name] = new Game(name);
        roomNumber++;
        socket.emit('games_list', {
            games: games
        });
    })
});


// for parsing multipart/form-data
app.use(upload.array());
app.use(express.static('public'));


// server.listen(3000);
server.listen(15604);








