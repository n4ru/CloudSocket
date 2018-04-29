const fluidb = require('fluidb'),
    exec = require('child_process').exec,
    config = new fluidb('config'),
    master = config.master,
    WebSocket = require('ws'),
    fs = require('fs');

let connect = () => {
    ws = new WebSocket('ws://' + config.host + ':1337');

    ws.onopen = function() {
        process.stdout.write('\033c');
        console.log(`====================\n      DysonIO       \n      r1-slave      \n====================`);
        console.log(`>> construct connected to ${config.host}.`);
    }

    ws.onmessage = function(event) {
        var msg = JSON.parse(event.data);
        switch (msg.type) {
            case 'keepalive':
                break;
            case 'connection':
                break;
            case 'cmd':
                exec(msg.data, (err, stdout, stderr) => {
                    ws.send(JSON.stringify({
                        type: "confirm"
                    }));
                    if (err) {
                        process.stdout.write(`>> ${err}`);
                    } else if (stderr) {
                        process.stdout.write(`>> ${stderr}`);
                    } else {
                        process.stdout.write(`>> ${stdout}`);
                    }
                })
                break;
            case 'file':
                fs.writeFile(msg.filename, Buffer.from(msg.data), function(err) {
                    if (err) {
                        console.log(err);
                        ws.send(JSON.stringify({
                            type: "confirm"
                        }));
                    } else {
                        console.log(">> wrote file " + msg.filename);
                        ws.send(JSON.stringify({
                            type: "confirm"
                        }));
                    }
                });
                break;
            case 'script':
                console.log(msg)
                break;
            default:
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

process.stdout.write('\033c');
console.log(`====================\n      DysonIO       \n      r1-slave      \n====================\n>> ready for dyson!`)
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