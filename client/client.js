const fluidb = require('fluidb'),
    exec = require('child_process').exec,
    config = new fluidb('config'),
    master = config.master,
    WebSocket = require('ws'),
    disc = true;

let connect = () => {
    ws = new WebSocket('ws://' + config.host + ':1337');

    ws.onopen = function() {
        disc = false;
        console.log(`>> construct connected to ${config.host}.`);
    }

    ws.onmessage = function(event) {
        var msg = JSON.parse(event.data);
        switch (msg.type) {
            case 'connection':
                console.log(`>> construct connected to ${config.host}.`);
                break;
            case 'cmd':
                exec(msg.data.command.join(" "), (err, stdout, stderr) => {
                    if (err) {
                        return;
                    }
                    process.stdout.write(`>> ${stdout}`);
                    process.stdout.write(`>> ${stderr}`);
                    ws.send(JSON.stringify({
                        type: "confirm"
                    }));
                })
                break;
            case 'file':
                console.log(msg)
                break;
            case 'script':
                console.log(msg)
                break;
            case 'default':
                console.log(msg)
                break;
        }
    }

    ws.onclose = function() {
        console.log(">> connection closed. hovering...")
        setTimeout(() => {
            connect();
        }, 5000)
    };
}

console.log(">> establishing connection...")

connect();

process.on('uncaughtException', function(err) {
    switch (err.code) {
        case 'ECONNREFUSED':
            console.error(">> failed to connect. hovering...");
            setTimeout(() => {
                connect();
            }, 5000)
            break;
        default:
            //console.log(err);
            break;
    }
})