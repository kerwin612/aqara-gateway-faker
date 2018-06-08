const randomstring = require('randomstring');
const crypto = require('crypto');
const dgram = require('dgram');
const fs = require('fs');
const mulicastServer = dgram.createSocket({
    type: 'udp4',
    reuseAddr: true
});
const unicastServer = dgram.createSocket({
    type: 'udp4',
    reuseAddr: true
});
const mulicastAddr = '224.0.0.50';
const mulicastPort = 4321;
const receiverPort = 9898;
const iv = Buffer.from([0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58, 0x56, 0x2e]);
const Log = require('./log');

module.exports = Gateway;

function Gateway(data, log) {
    this.data_path = null;
    this.log = log === undefined ? new Log() : log;
    let gateway = typeof(data) === 'string' ? (JSON.parse(fs.existsSync(data) ? fs.readFileSync(this.data_path = data) : data)) : data;
    if (!gateway) {
        throw new Error('gateway unexists');
    }
    this.pwd = gateway.pwd;
    this.sid = gateway.sid;
    this.token = getToken();
    this.model = gateway.model;
    this.devices = gateway.devices || {};
    this.proto_version = gateway.proto_version || '1';
    this.heartbeatInterval = gateway.heartbeatInterval;
    this.data = (gateway.data || []).filter(data => {
        return (!data.proto_version && !data.ip);
    });
    this.data.push({
        proto_version: this.proto_version
    });

    require('dns').lookup(require('os').hostname(), { family: 4 }, (function (err, address) {
        this.data.push({
            ip: address
        });
        this.__data__.data = this.data;
    }).bind(this))
    
    this.__init__ = true;
    this.__data__ = gateway;
}

Gateway.prototype.stop = function() {
    mulicastServer.close();
    unicastServer.close();
    this.__started__ = false;
}

Gateway.prototype.start = function() {
    if (!this.__init__) return;
    let gateway = this;
    
    mulicastServer.on('error', (err) => {
        this.log && this.log.info(`mulicast server error:\n${err.stack}`);
    });

    unicastServer.on('error', (err) => {
        this.log && this.log.info(`unicast server error:\n${err.stack}`);
    });

    mulicastServer.on('listening', () => {
        this.log && this.log.info('mulicast socket listening...');
        mulicastServer.addMembership(mulicastAddr);
        gateway.__started__ = true;
    });

    unicastServer.on('listening', () => {
        this.log && this.log.info('unicast socket listening...');
        gateway.port = unicastServer.address().port;
    });

    mulicastServer.on('message', (msg, rinfo) => {
        this.log && this.log.info(`mulicast server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
        gateway.parseMessage(msg.toString(), rinfo); 
    });

    unicastServer.on('message', (msg, rinfo) => {
        this.log && this.log.info(`unicast server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
        gateway.parseMessage(msg.toString(), rinfo); 
    });

    if (gateway.heartbeatInterval) {
        setInterval(() => {
            let _gateway = gateway.get();
            _gateway.token = gateway.token = getToken();
            gateway.heartbeat(_gateway);
        }, gateway.heartbeatInterval * 1000);
    }

    Object.values(gateway.devices).forEach(device => {
        if (device.heartbeatInterval) {
            setInterval(() => {
                gateway.heartbeat(gateway.get(device.sid));
            }, device.heartbeatInterval * 1000);
        }
    });

    mulicastServer.bind(mulicastPort);
    unicastServer.bind();
}

Gateway.prototype.get = function(sid) {
    if (!this.__data__ || (sid && (this.__data__.sid != sid && (!this.__data__.devices || !this.__data__.devices[sid]))))     return null;
    let device = Object.assign({sid: sid}, sid && sid !== this.__data__.sid ? this.__data__.devices[sid] : this.__data__);
    return device;
}

Gateway.prototype.set = function(device) {
    if (!device || !device.sid || !this.__data__ || !this.__data__.sid || (this.__data__.sid != device.sid && !this.__data__.devices[device.sid]))  return;
    let newData = device.data;
    let _device = this.get(device.sid);
    _device.data = _device.data || [];
    _device.data.forEach(data => {
        for (let key in data) {
            data[key] = newData[key] === undefined ? data[key] : newData[key];
            if (newData[key] !== undefined) {
                data.update_time = new Date().getTime();
            }
            delete newData[key];
        }
    });
    for (let key in newData) {
        let temp = {};
        temp[key] = newData[key];
        temp.update_time = new Date().getTime();
        _device.data.push(temp);
    }
    device.data = _device.data;
    if (device.sid === this.__data__.sid) {
        this.__data__ = Object.assign(this.__data__, device);
    } else {
        let temp = {};
        temp[device.sid] = device;
        this.__data__.devices = Object.assign(this.__data__.devices, temp);
    }
    if (this.data_path) {
        fs.writeFileSync(this.data_path, JSON.stringify(this.__data__, null, 4));
    }
    this.report(device);
}

Gateway.prototype.report = function(msg) {
    if (!msg || !this.__started__)   return;
    this.sendMessage(Object.assign({
        cmd: 'report'
    }, typeof(msg) === 'string' ? JSON.parse(msg) : msg), receiverPort);
}

Gateway.prototype.heartbeat = function(msg) {
    if (!msg || !this.__started__)   return;
    this.sendMessage(Object.assign({
        cmd: 'heartbeat'
    }, typeof(msg) === 'string' ? JSON.parse(msg) : msg), receiverPort);
}

Gateway.prototype.sendMessage = function(msg, rinfo) {
    if (!msg || !this.__started__)   return;
    let address = typeof(rinfo) === 'object' && rinfo.address || mulicastAddr;
    let port = typeof(rinfo) === 'object' && rinfo.port || rinfo;
    if (!port) {
        //error
        return;
    }
    let data = typeof(msg) === 'string' ? JSON.parse(msg) : msg;
    if (data.sid === this.sid) {
        delete data.devices;
        delete data.pwd;
    }
    let datas = data.data ? (data.data instanceof Array ? data.data : [data.data]) : [];
    delete data.data;
    if (this.proto_version.substring(0, 1) !== '1') {
        data.params = datas;
    } else {
        let temp = null;
        datas.forEach(data => {
            if (typeof(data) !== 'object') return;
            if (temp === null) temp = {};
            for (let key in data) {
                temp[key] = data[key];
            }
        });
        data.data = temp == null ? datas[0] : JSON.stringify(temp);
    }
    data = JSON.stringify(data);
    this.log && this.log.info(`server send: ${data} to ${address}:${port}`);
    mulicastServer.send(data, port, address);
}

Gateway.prototype.parseMessage = function(msg, rinfo) {
    if (!msg || !this.__started__)   return;
    let data = typeof(msg) === 'object' ? msg : JSON.parse(msg); 
    let cmd = data.cmd;
    let handler = null;
    if (!cmd) {
        //error
        return;
    } else if (cmd === 'whois') {
        handler = iam;
    } else if (cmd === 'read') {
        handler = readAck;
    } else if (cmd === 'write') {
        handler = writeAck;
    } else if (cmd === 'get_id_list' || cmd === 'discovery') {
        handler = listAck;
    } else {
        return;
    }
    handler.call(this, data, rinfo);
}

function iam(msg, rinfo) {
    this.sendMessage({
        cmd: 'iam',
        sid: this.sid,
        ip: this.data.ip,
        port: this.port,
        model: this.model
    }, rinfo);
}

function readAck(msg, rinfo) {
    let device = msg.sid === this.sid ? this.get() : this.get(msg.sid);
    this.sendMessage(Object.assign({
        cmd: this.proto_version.substring(0, 1) !== '1' ? 'read_rsp' : 'read_ack'
    }, device || {data: 'No device'}), rinfo);
} 

function writeAck(msg, rinfo) {
    let device = msg.sid === this.sid ? this.get() : this.get(msg.sid);
    let key = getKey(this.pwd, this.token);
    let data = device || {};
    let _key = this.proto_version.substring(0, 1) !== '1' ? msg.key : msg.data.key;
    if (!device) {
        data.data = 'No device';
    } else if (_key !== key) {
        data.data = 'invalid key.';
    } else {
        setTimeout(() => {
            msg.data && delete msg.data.key;
            delete msg.key;
            let newData = {};
            if (this.proto_version.substring(0, 1) !== '1') {
                for (let i = 0, j = msg.params.length; i < j; i++) {
                    newData = Object.assign(newData, msg.params[i]);
                }
            } else {
                newData = msg.data;
            }
            device.data = newData;
            this.set(device);
        }, 100);
    }
    this.sendMessage(Object.assign({
        cmd: this.proto_version.substring(0, 1) !== '1' ? 'write_rsp' : 'write_ack'
    }, data), rinfo);
}

function listAck(msg, rinfo) {
    let data = {};
    if (this.proto_version.substring(0, 1) !== '1') {
        data.cmd = 'discovery_rsp';
        data.dev_list = [];
        let devices = ((this.get()||{}).devices||{});
        for (let key in devices) {
            data.dev_list.push({ sid: key, model: devices[key].model });
        }
    } else {
        data.cmd = 'get_id_list_ack';
        data.data = JSON.stringify(Object.keys((this.get()||{}).devices)||[]);
    }
    this.sendMessage(Object.assign({
        sid: this.sid,
        token: this.token,
        model: this.model
    }, data), rinfo);
}

function getToken() {
    return randomstring.generate({ length: 16, capitalization: 'lowercase' });
}

function getKey(pwd, token) {
    let cipher = crypto.createCipheriv('aes-128-cbc', pwd, iv);
    let key = cipher.update(token, "ascii", "hex");
    cipher.final('hex');
    return key;
}
