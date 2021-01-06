"use strict";

/*
  Copyright (c) 2019 Ramón Baas
  Modified work copyright (c) 2020 Rickth64
  Modified work copyright (c) 2021 Laurent Baum (LarsenDX)

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  NodeJS code to control an airconditioner via an Intesis (airconwithme) web server
*/

const http = require("http");
const zlib = require("zlib");


const apiSignals = {
    "active": {
        "uid":1,
        "values": {
            "on":1,
            "off":0
        }
    },
    "mode": {
        "uid":2,
        "values": {
            "auto": 0,
            "heat": 1,
            "dry": 2,
            "fan": 3,
            "cool": 4
        }
    },
    "speed": { //fan speed
        "uid":4,
        "values": {
            "auto": 0,
            "speed 1": 1,
            "speed 2": 2,
            "speed 3": 3,
            "speed 4": 4
        }
    },
    "vanesUpDown": { //Vanes Up/Down Position
        "uid": 5,
        "values": {
            "auto": 0,
            "pos 1": 1,
            "pos 2": 2,
            "pos 3": 3,
            "pos 4": 4,
            "swing": 10,
            "swirl": 11,
            "wide": 12
        }
    },
    "userSetPoint": {
        "uid":9
    },
    "parental": { // Parental Lock (Remote Disabled)
        "uid": 12,
        "values": {
            "on":1,
            "off":0
        }
    },
    "currentTemp": {
        "uid": 10
    },
    "minTempSetPoint": {
        "uid": 35
    },
    "maxTempSetPoint": {
        "uid": 36
    }
};


class IntesisACWM {

    constructor(ip, username, password, auto) {
        this.ip = ip;
        this.username = username;
        this.password = password;
        this.auto = (auto == null ? true : auto); // auto login
        this.initDone = false;
        this.session = null;
    }

    // account for API treating temp as 230 intead of 23 degrees
    normalizeTemp(toFrom, temp) {
        switch (toFrom) {
            case "to": //to api
                return parseInt(temp) * 10;
            break;
            case "from":// from api
                return parseInt(temp) / 10;
            break;
        }
    }
    
    getActive (log) {
        return new Promise((resolve, reject) => {
            this.getDataPointValue(apiSignals["active"].uid)
                .then(result => {
                    log(`Got the value: ${result.value}`);
                    resolve (result.value);
                })
                .catch(error => reject(error));
        });
    }
        
    getMode (log) {
        return new Promise((resolve, reject) => {
            this.getDataPointValue(apiSignals["mode"].uid)
                .then(result => {
                    log(`Got the value: ${result.value}`);
                    resolve (result.value);
                })
                .catch(error => reject(error));
        });
    }
    
    getSwingMode (log) {
        return new Promise((resolve, reject) => {
            this.getDataPointValue(apiSignals["vanesUpDown"].uid)
                .then(result => {
                    log(`Got the value: ${result.value}`);
                    let swingMode = ~~( result.value === apiSignals["vanesUpDown"]["values"]["swing"] ); // ~~ turns bool to int
                    resolve (swingMode);
                })
                .catch(error => reject(error));
        });
    }
    
    getRotationSpeed (log) {
        return new Promise((resolve, reject) => {
            this.getDataPointValue(apiSignals["speed"].uid)
                .then(result => {
                    log(`Got the value: ${result.value}`);
                    resolve (result.value);
                })
                .catch(error => reject(error));
        });
    }
    
    getLockPhysicalControls (log) {
        return new Promise((resolve, reject) => {
            this.getDataPointValue(apiSignals["parental"].uid)
                .then(result => {
                    log(`Got the value: ${result.value}`);
                    resolve (result.value);
                })
                .catch(error => reject(error));
        });
    }
    
    getCurrentTemperature (log) {
        return new Promise((resolve, reject) => {
            this.getDataPointValue(apiSignals["currentTemp"].uid)
                .then(result => {
                    log(`Got the value: ${result.value}`);
                    resolve (this.normalizeTemp("from", result.value));
                })
                .catch(error => reject(error));
        });
    }
    
    getSetPoint (log) {
        return new Promise((resolve, reject) => {
            this.getDataPointValue(apiSignals["userSetPoint"].uid)
                .then(result => {
                    log(`Got the value: ${result.value}`);
                    resolve (this.normalizeTemp("from", result.value));
                })
                .catch(error => reject(error));
        });
    }

/*
    getMinTempSetPoint (callback) {
        this.getDataPointValue(apiSignals["minTempSetPoint"].uid)
        .then(info => {
            this.log(`Successfully got minTempSetPoint: ${info.value}`);
            callback (null, info.value);
        });
    }
    
    getMaxTempSetPoint (callback) {
        this.getDataPointValue(apiSignals["maxTempSetPoint"].uid)
        .then(info => {
            this.log(`Successfully got maxTempSetPoint: ${info.value}`);
            callback (null, info.value);
        });
    }
 */
    
    
    setActive(value, log) {
        return new Promise((resolve, reject) => {
            this.setDataPointValue(apiSignals["active"].uid, value)
            .then(result => {
                log(`Successfully set value for active: `, value);
                resolve(null);
            })
            .catch(error => reject(error));
        });
    }
        
    setMode (value, log) {
        return new Promise((resolve, reject) => {
            this.setDataPointValue(apiSignals["mode"].uid, value)
                .then(result => {
                    log(`Successfully set value for mode: `, value);
                    resolve (null);
                })
                .catch(error => reject(error));
        });
    }
    
    setSetPoint (value, log) {
        return new Promise((resolve, reject) => {
            this.setDataPointValue(apiSignals["userSetPoint"].uid, this.normalizeTemp("to", value))
                .then(result => {
                    log(`Successfully set value for userSetPoint: `, value);
                    resolve (null);
                })
                .catch(error => reject(error));
        });
    }
    
    setRotationSpeed (value, log) {
        return new Promise((resolve, reject) => {
            this.setDataPointValue(apiSignals["speed"].uid, value)
                .then(result => {
                    log(`Successfully set value for speed: `, value);
                    resolve (null);
                })
                .catch(error => reject(error));
        });
    }
    
    setSwingMode (swingMode, vanePosition, log) {
        //set to 10 if swing on, set to configured vane position if swing off
        var value = swingMode ? apiSignals["vanesUpDown"]["values"]["swing"] : vanePosition;
        return new Promise((resolve, reject) => {
            this.setDataPointValue(apiSignals["vanesUpDown"].uid, value)
                .then(result => {
                    log(`Successfully set value for vanesUpDown: `, value);
                    resolve (null);
                })
                .catch(error => reject(error));
        });
    }
    
    setLockPhysicalControls (value, log) {
        return new Promise((resolve, reject) => {
            this.setDataPointValue(apiSignals["parental"].uid, value)
                .then(result => {
                    log(`Successfully set value for parental: `, value);
                    resolve (null);
                })
                .catch(error => reject(error));
        });
    }

    // Enable a retry mechanism for the writeCommand operation, which can intermittently fail on ECONNRESET
    wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    retryWriteCommandOperation(cmd, data, delay, times) {
        const thisObject = this;
        return new Promise((resolve, reject) => {
            return thisObject.writeCommand(cmd, data)
                .then(resolve)
                .catch((reason) => {
                    if (times - 1 > 0) {
                        return thisObject.wait(delay)
                            .then(thisObject.retryWriteCommandOperation.bind(thisObject, cmd, data, delay, times - 1))
                            .then(resolve)
                            .catch(reject);
                    }
                    return reject(reason);
                });
        });
    }

    // init: Get reference information
    // The file "data.json" should be accessible on the web server wothout authentication
    init() {
        return new Promise((resolve, reject) => {
            const url = {
                host: this.ip,
                path: "/js/data/data.json",
                encoding: "utf8"
            };
            http.get(url, response => {
                const { statusCode } = response;
                let data = new Buffer.from("");
                response.on("data", x => { data = Buffer.concat([data, x]); });
                response.on("end", () => {
                    if (statusCode === 200) {
                        this.ref = JSON.parse(zlib.unzipSync(new Buffer(data, "utf8")).toString());
                        this.initDone = true;
                        resolve(this.ref);
                    } else {
                        reject("Cannot load " + url.path);
                    }
                });
                response.on("error", (error) => {
                    reject(error);
                });
            });
        });
    }

    // writeCommand: write a command to the unit via port 80
    // Expected only to be used internally
    writeCommand(cmd, data) {
        return new Promise((resolve, reject) => {
                const payload = JSON.stringify({
                    command: cmd,
                    data: data
                });
                const options = {
                    hostname: this.ip,
                    path: "/api.cgi",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": payload.length
                    }
                };
                const req = http.request(options, (res) => {
                    res.on("data", async (d) => {
                        let result = JSON.parse(d);
                        result.code = res.statusCode;
                        //console.log(result)
                        if (result.success) {
                            resolve(result);
                        } else { // auto login
                            if (this.auto && cmd !== "login" && result.error.code === 1) {
                                try {
                                    await this.login();
                                    data.sessionID = this.session; // update session ID
                                    resolve(this.writeCommand(cmd, data));
                                } catch (error) {
                                    reject(error);
                                }
                            } else {
                                reject(result);
                            }
                        }
                    });
                });

                req.on("error", (error) => {
                    reject(error);
                });

                req.write(payload);
                req.end();
        });
    }

    // getInfo: get info about the unit
    // This function does not need autorization
    getInfo() {
        return new Promise((resolve, reject) => {
            this.writeCommand("getinfo", null)
                .then(result => {
                    if (result.success) {
                        this.info = result.data.info;
                        resolve(this.info);
                    } else {
                        reject(result);
                    }
                })
                .catch(error => reject(error));
        });
    }

    // Login to the web interface (most functions need authorization to work)
    // Provide a username and password (default is admin, admin)
    login(username, password) {
        return new Promise((resolve, reject) => {
            this.writeCommand("login", { username: username || this.username, password: password || this.password })
                .then(result => {
                    if (result.success) {
                        this.username = username || this.username;
                        this.password = password || this.password;
                        this.session = result.data.id.sessionID;
                        resolve(result);
                    } else {
                        reject(result);
                    }
                })
                .catch(error => reject(error));
        });
    }

    // logout: end the session
    logout() {
        let session = this.session;
        delete this.session;
        return this.writeCommand("logout", { sessionID: session });
    }

    // getSession: return the session identifier
    getSession() {
        return this.session;
    }

    getCurrentConfig() {
        return new Promise((resolve, reject) => {
            this.writeCommand("getcurrentconfig", { sessionID: this.session })
                .then(result => {
                    if (result.success) {
                        resolve(result.data.config);
                    } else {
                        reject(result);
                    }
                })
                .catch(error => reject(error));
        });
    }

    // getAvailableDataPoints: return the list of uids of the datapoints that are supported by this device
    getAvailableDataPoints() {
        return new Promise((resolve, reject) => {
            this.writeCommand("getavailabledatapoints", { sessionID: this.session })
                .then(result => {
                    if (result.success) {
                        resolve(result.data.dp.datapoints);
                    } else {
                        reject(result);
                    }
                })
                .catch(error => reject(error));
        });
    }

    // getDataPointValue: get the value of a certain datapoint (use "null" to get all)
    getDataPointValue(uid) {
        return new Promise((resolve, reject) => {
            /*this.writeCommand("getdatapointvalue", { sessionID: this.session, uid: uid || "all" })*/
            this.retryWriteCommandOperation("getdatapointvalue", { sessionID: this.session, uid: uid || "all" }, 500, 5) // increase delay to 500
            //this.retryWriteCommandOperation("getdatapointvalue", { sessionID: this.session, uid: uid || "all" }, 100, 5)
                .then(result => {
                    if (result.success) {
                        resolve(result.data.dpval);
                    } else {
                        reject(result);
                    }
                })
                .catch(error => reject(error));
        });
    }

    // setDataPointValue:
    setDataPointValue(uid, value) {
        return new Promise(async (resolve, reject) => {
            /*
            if (this.dp === undefined) {
              try {
                this.dp = await this.getAvailableDataPoints()
              } catch (error) {
                reject(error)
              }
            }
            if (this.dp[uid] !== undefined) {
      
            } else {
              reject("UID " + uid + " not supported")
            }
            */
            /*this.writeCommand("setdatapointvalue", { sessionID: this.session, uid: uid, value: value })*/
            this.retryWriteCommandOperation("setdatapointvalue", { sessionID: this.session, uid: uid, value: value }, 100, 5)
                .then(result => {
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(result);
                    }
                })
                .catch(error => reject(error));
        });
    }

    // identify: flash the light on de device to identify it
    identify() {
        return this.writeCommand("identify", { sessionID: this.session });
    }

    // reboot: reboot the device
    reboot() {
        return this.writeCommand("reboot", { sessionID: this.session });
    }

    
    
    
    // Not implemented:
    // - update_password { sessionID, currentPass, newPass }
    // - wpsstart { sessionID }
    // - setdefaults { sessionID }
    // - setconfig { sessionID, ip, netmask, dfltgw, dhcp, ssid, security, lastconfigdatetime }
    // - getaplist { sessionID }
}

module.exports = IntesisACWM;
