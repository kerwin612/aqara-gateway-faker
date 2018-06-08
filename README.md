# aqara-gateway-faker  

Library to help you develop [Aqara LAN protocols](https://github.com/aqara/aiot-gateway-local-api) applications.


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
