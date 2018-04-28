const fluidb = require('fluidb'),
    exec = require('child_process').exec,
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
    vorpal = require('vorpal')(),
    wss = new WebSocketServer({
        port: port
    });

var transmit = function(data) {
    for (var i = 0; i < connections.length; i++) {
        try {
            connections[i].send(JSON.stringify(data));
        } catch (err) {
            connections.splice(i, 1);
            vorpal.log(`>> construct disconnected [${connections.length} active constructs].`)
            continue;
        }
    }
};

let counter = 0;

let cmd = () => {
    vorpal
        .delimiter('>>> ')
        .show();
}

var keepalive = setInterval(function() {
    transmit({
        type: "keepalive"
    });
}, 10000);

wss.on('connection', function(ws) {
    connections.push(ws);

    vorpal
        .log(`>> construct connected [${connections.length} active constructs].`)
    cmd();

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
        vorpal.log(`>> construct error.`)
    })

    ws.on('message', function(msg) {
        transmit({
            type: "confirm",
            response: "got message."
        })
        counter++;
        //vorpal.log(counter)
        if (counter == connections.length) {
            counter = 0;
            vorpal.log(">> command successfully completed.")
        }
    })
});

vorpal
    .log('>> dyson is ready for constructs!')
    .catch('[command...]', 'Execute a command.')
    .action(function(args, callback) {
        transmit({
            "type": "cmd",
            "data": args
        });
        counter = 0;
        callback();
    });