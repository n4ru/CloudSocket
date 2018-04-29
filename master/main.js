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
    ProgressBar = require('progress'),
    wss = new WebSocketServer({
        port: port
    }),
    hearts = {};

let cmd = setInterval(function() {
    if (connections.length > 0) {
        vorpal
            .show().ui.delimiter('>>> ');
    }
}, 500);;

let counter = 0;

var transmit = function(data) {
    for (var i = 0; i < connections.length; i++) {
        try {
            connections[i].send(JSON.stringify(data));
        } catch (err) {
            connections.splice(i, 1);
            vorpal.log(`>> construct disconnected [${connections.length} active constructs].`)
            vorpal
                .show().ui.delimiter('>>> ');
            continue;
        }
    }
};

var keepalive = setInterval(function() {
    for (var i = 0; i < connections.length; i++) {
        let randVal = Math.floor(Math.random() * 10000000);
        try {
            connections[i].send(JSON.stringify({
                type: "keepalive",
                data: randVal
            }));
            hearts[randVal] = {
                id: i
            };
            hearts[randVal].timer = setTimeout(function() {
                connections.splice(hearts[randVal].id, 1);
                vorpal.log(`>> construct disconnected [${connections.length} active constructs].`)
                vorpal
                    .show().ui.delimiter('>>> ');
            }, 5000)
        } catch (err) {
            connections.splice(i, 1);
            vorpal.log(`>> construct disconnected [${connections.length} active constructs].`)
            vorpal
                .show().ui.delimiter('>>> ');
            continue;
        }
    }
}, 15000);

wss.on('connection', function(ws) {
    connections.push(ws);

    vorpal
        .log(`>> construct connected [${connections.length} active constructs].`)

    transmit({
        "type": "connection",
        "data": "connection established."
    });

    ws.on('close', function() {})

    ws.on('error', function() {
        vorpal.log(`>> construct error.`)
    })

    ws.on('message', function(msg) {
        msg = JSON.parse(msg);
        transmit({
            type: "confirm",
            response: "got message."
        })
        switch (msg.type) {
            case "confirm":
                counter++;
                vorpal.ui
                    .delimiter('>> ')
                    .redraw(`[${counter} / ${connections.length}] constructs have completed execution.`)
                if (counter == connections.length) {
                    vorpal.ui.redraw.done();
                }
                break;
            case "keepalive":
                clearTimeout(hearts[msg.data].timer);
                delete hearts[msg.data];
                break;
            default:
                break;
        }
    })
});


process.stdout.write('\033c');

vorpal
    .log(`====================\n      DysonIO       \n     r1-master      \n====================\n>> ready for constructs!`)
    .mode('>')
    .action(function(command, callback) {
        if (command.split(" ")[0] == "push") {
            try {
                let file = fs.readFileSync(command.split(" ")[1]);
                vorpal.log(">> sending over file")
                transmit({
                    "type": "file",
                    "filename": command.split(" ")[1],
                    "data": file.toString()
                });
                counter = 0;
            } catch (err) {
                this.log(">> file not found");
            }
            callback();
        } else {
            transmit({
                "type": "cmd",
                "data": command
            });
            counter = 0;
            callback();
        }
    });

vorpal
    .exec('>');