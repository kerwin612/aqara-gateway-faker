const readline = require('readline');
const Log = require('./log');
const Gateway = require('./gateway');

Log.prototype.info = function() {
    console.log();
    console.log.apply(null, arguments);
}

function readSyncByRl(tips) {
    tips = tips || '> ';
    
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(tips, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

function exec(input) {
    let args = input && input.split(' ');
    let cmd = args && args[0];
    switch (cmd||'empty') {
        case 'empty':
            break;
        case 'start':
            gateway.start();
            break;
        case 'stop':
            gateway.stop();
            break;
        case 'exit':
            process.exit(0);
            break;
        case 'get':
            console.log(JSON.stringify(gateway.get(args && args.length > 0 && args[1] || null) || {}, (key, value) => {
                return key === 'update_time' ? value + ' / ' + new Date(value).toLocaleString() : value;
            }, 4));
            break;
        case 'set':
            if (!args || args.length < 3) {
                console.log('invalid args');
                break;
            }
            let device = gateway.get(args[1]);
            if (!device) {
                console.log('device[' + args[1] + '] unexists');
                break;
            }
            let jsonStr = '{';
            for (let i = 2, j = args.length; i < j; i++) {
                let info = args[i].split('=');
                if (info.length != 2) continue;
                jsonStr += ('"' + info[0] + '":' + ((info[1] && /[a-zA-Z]+/.test(info[1]) && info[1] !== 'true' && info[1] !== 'false') ? ('"' + info[1] + '"') : info[1]) + (i != j - 1 ? ',' : ''));
            }
            jsonStr += '}';
            device.data = JSON.parse(jsonStr);
            gateway.set(device);
            break;
        default:
            console.log('unknow.');
            console.log(helper);
    }
    readSyncByRl().then(exec);
}


const helper = '\
Usage: aqara-gateway-faker json-string / json-file\n\
  COMMAND:\n\
    start\n\
        start gateway service with json data\n\
    stop\n\
        stop gateway service\n\
    exit\n\
        exit\n\
    get [sid]\n\
        print current data\n\
    set sid key=value [key=value]...\n\
        set data to gateway\n\
  ARGS:\n\
    sid\t   device sid from json data\n\
    key\t   device property from json data\n\
  eg:\n\
    aqara-gateway-faker ./sample.json\n\
    > start\n\
    > get\n\
    ...\n\
    > set xxxxxxx status=motion\n\
    > set xxxxxxx illumination=500 rgb=3036676095\n\
    ...\n\
';
console.log(helper);

if (process.argv.length != 3) {
    console.log('invalid startup arg.');
    return;
}

const gateway = new Gateway(process.argv[2]);

readSyncByRl().then(exec);
