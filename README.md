# aqara-gateway-faker  

Library to help you develop [Aqara LAN protocols](https://github.com/aqara/aiot-gateway-local-api) ([doc](http://docs.opencloud.aqara.com/development/gateway-LAN-communication/)) applications.


## Installation  

To install `aqara-gateway-faker`, use [npm](http://github.com/npm/npm):
```
npm i -g aqara-gateway-faker
```  

## Usage  
```shell
Usage: aqara-gateway-faker json-string / json-file
  COMMAND:
    start
        start gateway service with json data
    stop
        stop gateway service
    exit
        exit
    get [sid]
        print current data
    set sid key=value [key=value]...
        set data to gateway
  ARGS:
    sid    device sid from json data
    key    device property from json data
  eg:
    aqara-gateway-faker ./sample.json
    > start
    > get
    ...
    > set xxxxxxx status=motion
    > set xxxxxxx illumination=500 rgb=3036676095
    ...
```

**json data sample:**
```json
{
    "model": "gateway",
    "sid": "klijlkdfinds",
    "pwd": "ijeslefsjkdedsfb",
    "proto_version": "2.x", //support 1.x / 2.x
    "devices": {
        "jkijklijklijijlk": {
            "model": "motion",
            "data": [
                {
                    "status": "motion",
                    "update_time": 1528419256399
                }
            ]
        }
    },
    "data": [
        {
            "rgb": 3036676095,
            "update_time": 1528419219024
        },
        {
            "illumination": 500,
            "update_time": 1528419219024
        }
    ]
}
```
