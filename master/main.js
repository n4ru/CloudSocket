const fluidb = require('fluidb'),
    spawn = require("child_process"),
    fs = require('fs'),
    os = require('os'),
    config = new fluidb('config'),
    db = new fluidb(),
    logs = new fluidb('logs'),
    connections = [],
    Ws = require('ws'),
    interfaces = os.networkInterfaces(),
    WebSocketServer = Ws.Server,
    port = config.port || 1337,
    wss = new WebSocketServer({
        port: port
    });


var transmit = function(data) {
    for (var i = 0; i < connections.length; i++) {
        try {
            connections[i].send(JSON.stringify(data));
        } catch (err) {
            connections.splice(i, 1);
            console.log(`>> construct disconnected [${connections.length} active contructs].`)
            continue;
        }
    }
};

var keepalive = setInterval(function() {
    transmit({
        type: "keepalive"
    });
}, 10000);

wss.on('connection', function(ws) {
    connections.push(ws);
    console.log(`>> construct connected [${connections.length} active contructs].`);
    transmit({
        "type": "connection",
        "data": "connection established."
    });
    ws.on('close', function() {
        transmit({
            type: "keepalive"
        });
    })
    ws.on('error', function() {
        console.log(`>> construct error.`)
    })
    ws.on('message', function(msg) {
        transmit({
            type: "confirm",
            response: "got message."
        })
    })
});

console.log('>> dyson is ready for constructs!');