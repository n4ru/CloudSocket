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
    });

let counter = 0;

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

let cmd = () => {
    vorpal
        .show().ui.delimiter('>>> ');
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
                    .delimiter('>>> ')
                if (counter == connections.length) {
                    vorpal.ui.redraw.done();
                    //vorpal.log(`>> command completed successfully.`);
                }
                break;
        }
    })
});


process.stdout.write('\033c');

vorpal
    .log(`====================\n      DysonIO       \n     r1-master      \n====================\n>> ready for constructs!`)
    .mode('>')
    //.delimiter('')
    .action(function(command, callback) {
        transmit({
            "type": "cmd",
            "data": command
        });
        counter = 0;
        callback();
    })
    .on('client_command_executed', function(evt) {
        process.exit(0)
    });

vorpal
    .exec('>');

/*
vorpal
    .log(`====================\n      DysonIO       \n     r1-master      \n====================\n>> ready for constructs!`)
    //.catch('[command...] <stuff...>', 'Execute a command.')
    .action(function(args, callback) {
        console.log(args);
        transmit({
            "type": "cmd",
            "data": args
        });
        counter = 0;
        callback();
    });

/*
vorpal
    .catch('clear', 'Execute a command.')
    .action(function(args, callback) {
        process.stdout.write('\033c');
        callback();
    });
*/