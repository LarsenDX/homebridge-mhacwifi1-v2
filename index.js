/* MIT License
Copyright (c) 2020 Laurent Baum (LarsenDX)
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */

"use strict";

const acwmApi = require("./acwm-api/acwm-api.js");
//const StateManager = require("./StateManager.js")
//var Service, Characteristic, HomebridgeAPI;
let Service;
let Characteristic;
const PLUGIN_NAME = "homebridge-mhacwifi1-v2"; // "homebridge-mhacwifi1"
const ACCESSORY_NAME = "MHI-AC"; // "MH-AC-WIFI-1"
const MANUFACTURER = "Mitsubishi Heavy Industries";
const MODEL = "MH-AC-WIFI-1";
const MINTEMPSETPOINT = 18;
const MAXTEMPSETPOINT = 30;
const MINROTATIONSPEED = 0;
const MAXROTATIONSPEED = 100;
const STEPROTATIONSPEED = 25;

//ACWM MODE values
const AUTO = 0;
const HEAT = 1;
const DRY = 2;
const FAN = 3;
const COOL = 4;


module.exports = (api) => api.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, MhiAcAccessory);

class MhiAcAccessory {
    constructor(log, config, api) {
        
        Service = api.hap.Service;
        Characteristic = api.hap.Characteristic;
        
        this.log = log;
        //this.config = config;
        this.api = api; /*homebridge API*/
        this.manufacturer = MANUFACTURER;
        this.model = MODEL;
        this.serial = config["serial"] || "1234";
        this.username=config["username"] || "operator";
        this.password=config["password"] || "operator";
        this.ip=config["ip"];
        this.displayName=config["name"];
        this.vanePosition=config["vaneposition"] || 1;
        this.mode = AUTO; // start off with AUTO, can be AUTO 0, HEAT 1, DRY 2, FAN 3, COOL 4

        // Intesis (=MHI supplier) LAN API
        this.vendorApi = new acwmApi(this.ip, this.username, this.password);
        
        this.minTempSetPoint = MINTEMPSETPOINT;
        this.maxTempSetPoint = MAXTEMPSETPOINT;
        
        //State Manager of this accessory
        //this.stateManager = require("./StateManager")(this, api);
    
        // HAP AccessoryInformation service
        this.informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer,this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);
        
        //////////////////////////
        //HAP HeaterCooler service
        /////////////////////////
        this.HeaterCoolerService = new Service.HeaterCooler(this.displayName + " Heater Cooler");
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.Active)
            .on("get", callback => { this.updateHomeKit("HeaterCoolerService", "Active", callback); })
            .on("set", (value, callback) => { this.updateMHIAC("HeaterCoolerService", "Active", value, callback); });
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
            .on("get", callback => { this.updateHomeKit("HeaterCoolerService","CurrentHeaterCoolerState",callback); });
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
            .on("get", callback => { this.updateHomeKit("HeaterCoolerService","TargetHeaterCoolerState",callback); })
            .on("set", (value, callback) => { this.updateMHIAC("HeaterCoolerService", "TargetHeaterCoolerState", value, callback); });
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature)
            .on("get", callback => { this.updateHomeKit("HeaterCoolerService", "CurrentTemperature", callback); });
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: MINROTATIONSPEED,
                maxValue: MAXROTATIONSPEED,
                minStep: STEPROTATIONSPEED
            })
            .on("get", callback => { this.updateHomeKit("HeaterCoolerService","RotationSpeed",callback); })
            .on("set", (value, callback) => { this.updateMHIAC("HeaterCoolerService", "RotationSpeed", value, callback); });
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.SwingMode)
            .on("get", callback => { this.updateHomeKit("HeaterCoolerService","SwingMode",callback); })
            .on("set", (value, callback) => { this.updateMHIAC("HeaterCoolerService", "SwingMode", value, callback); });
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.LockPhysicalControls)
            .on("get", callback => { this.updateHomeKit("HeaterCoolerService","LockPhysicalControls",callback); })
            .on("set", (value, callback) => { this.updateMHIAC("HeaterCoolerService", "LockPhysicalControls", value, callback); });
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: MINTEMPSETPOINT,
                maxValue: MAXTEMPSETPOINT,
                minStep: 1
            })
            .on("get", callback => { this.updateHomeKit("HeaterCoolerService","CoolingThresholdTemperature",callback); })
            .on("set", (value, callback) => { this.updateMHIAC("HeaterCoolerService", "CoolingThresholdTemperature", value, callback); });
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .setProps({
                minValue: MINTEMPSETPOINT,
                maxValue: MAXTEMPSETPOINT,
                minStep: 1
            })
            .on("get", callback => { this.updateHomeKit("HeaterCoolerService","HeatingThresholdTemperature",callback); })
            .on("set", (value, callback) => { this.updateMHIAC("HeaterCoolerService", "HeatingThresholdTemperature", value, callback); });
        
        ////////////////////////////
        //HAP HumidifierDehumidifier
        ////////////////////////////
        this.DehumidifierService = new Service.HumidifierDehumidifier(this.displayName + " Dehumidifier");
            
        this.DehumidifierService.getCharacteristic(Characteristic.Active)
            .on("get", callback => { this.updateHomeKit("DehumidifierService", "Active", callback); })
            .on("set", (value, callback) => { this.updateMHIAC("DehumidifierService", "Active", value, callback); });
        
        this.DehumidifierService.getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState)
            .on("get", callback => { this.updateHomeKit("DehumidifierService", "CurrentHumidifierDehumidifierState", callback); });
        
        this.DehumidifierService.getCharacteristic(Characteristic.TargetHumidifierDehumidifierState)
            .setProps({
                minValue: Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER,
                maxValue: Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER,
                validValues: [Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER]
            })
            .on("get", callback => { this.updateHomeKit("DehumidifierService", "TargetHumidifierDehumidifierState", callback); })
            .on("set", (value, callback) => { this.updateMHIAC("DehumidifierService", "TargetHumidifierDehumidifierState", value, callback); });
        
        this.DehumidifierService.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: MINROTATIONSPEED,
                maxValue: MAXROTATIONSPEED,
                minStep: STEPROTATIONSPEED
            })
            .on("get", callback => { this.updateHomeKit("DehumidifierService","RotationSpeed",callback); })
            .on("set", (value, callback) => { this.updateMHIAC("DehumidifierService", "RotationSpeed", value, callback); });
        
        this.DehumidifierService.getCharacteristic(Characteristic.SwingMode)
            .on("get", callback => { this.updateHomeKit("DehumidifierService", "SwingMode", callback); })
            .on("set", (value, callback) => { this.updateMHIAC("DehumidifierService", "SwingMode", value, callback); });
        
        this.DehumidifierService.getCharacteristic(Characteristic.LockPhysicalControls)
            .on("get", callback => { this.updateHomeKit("DehumidifierService", "LockPhysicalControls", callback); })
            .on("set", (value, callback) => { this.updateMHIAC("DehumidifierService", "LockPhysicalControls", value, callback); });
        
        this.DehumidifierService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on("get", callback => { this.updateHomeKit("DehumidifierService", "CurrentRelativeHumidity", callback); });
        
        ////////////////////////////
        //HAP FanV2 service
        ////////////////////////////
        this.FanService = new Service.Fanv2(this.displayName + " Fan");
        
        this.FanService.getCharacteristic(Characteristic.Active)
            .on("get", callback => { this.updateHomeKit("FanService", "Active", callback); })
            .on("set", (value, callback) => { this.updateMHIAC("FanService", "Active", value, callback); });
        
        this.FanService.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: MINROTATIONSPEED,
                maxValue: MAXROTATIONSPEED,
                minStep: STEPROTATIONSPEED
            })
            .on("get", callback => { this.updateHomeKit("FanService","RotationSpeed",callback); })
            .on("set", (value, callback) => { this.updateMHIAC("FanService", "RotationSpeed", value, callback); });
        
        this.FanService.getCharacteristic(Characteristic.SwingMode)
            .on("get", callback => { this.updateHomeKit("FanService", "SwingMode", callback); })
            .on("set", (value, callback) => { this.updateMHIAC("FanService", "SwingMode", value, callback); });
        
        this.FanService.getCharacteristic(Characteristic.LockPhysicalControls)
            .on("get", callback => { this.updateHomeKit("FanService", "LockPhysicalControls", callback); })
            .on("set", (value, callback) => { this.updateMHIAC("FanService", "LockPhysicalControls", value, callback); });
    }
    
    getServices() {
        return [
                this.informationService,
                this.HeaterCoolerService,
                this.DehumidifierService,
                this.FanService
        ];
    }
    
    updateMHIAC(serviceName, characteristicName, value, callback){
        this.log.debug(`Update MHIAC: ${serviceName} ${characteristicName} `, value);
        
        //Active
        if ( characteristicName === "Active") {
            let active = value;
            if ( !active ) { // turn off AC
                //HeaterCooler asks for turn off when the user opens its widget in Home. Don't forward this to MHI when we're in DRY or FAN
                if ( serviceName === "HeaterCoolerService" && (this.mode === FAN || this.mode === DRY) ) {
                    this.log.debug(`HeaterCoolerService wants to turn off at this.mode: `, this.mode)
                    callback(null);
                }
                else // otherwise turn off
                {
                    this.log.debug(`${serviceName} wants to turn off at this.mode: `, this.mode)
                    this.vendorApi.setActive(active, this.log)
                    .then(result => {
                        callback(null);
                    })
                    .catch(error => {
                        this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                        callback(error);
                    });
                }
            }
            else { // turn on AC, first figure out what mode to run
                switch (serviceName) {
                    case "HeaterCoolerService":
                        //don't switch modes here for now
                        break;
                    case "DehumidifierService":
                        this.vendorApi.setMode(DRY, this.log)
                        .then(result => { // make sure all HomeKit services are upToDate
                            this.updateValue(this.HeaterCoolerService,"Active",Characteristic.Active.INACTIVE);
                            this.updateValue(this.FanService,"Active",Characteristic.Active.INACTIVE);
                            this.mode=DRY;
                        })
                        .catch(error => {
                            this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                            callback(error);
                        });
                        break;
                    case "FanService":
                        this.vendorApi.setMode(FAN, this.log)
                        .then(result => { // make sure all HomeKit services are upToDate
                            this.updateValue(this.HeaterCoolerService,"Active",Characteristic.Active.INACTIVE);
                            this.updateValue(this.DehumidifierService,"Active",Characteristic.Active.INACTIVE);
                            this.mode=FAN;
                        })
                        .catch(error => {
                            this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                            callback(error);
                        });
                        break;
                }
                //figured out mode, now turn on
                this.vendorApi.setActive(active, this.log)
                .then(result => {
                    callback(null);
                })
                .catch(error => {
                    this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                    callback(error);
                });
            }
        }
        
        //TargetHeaterCoolerState
        if ( characteristicName === "TargetHeaterCoolerState" ) {
            var _mode=null;
            switch ( value ) {
                    case Characteristic.TargetHeaterCoolerState.AUTO:
                        
                        // if FAN or DRY is set in MHI AND fan or dry is currently on in HK -> don't switch to AUTO
                        let _fanActive = this.FanService.getCharacteristic(Characteristic["Active"]).value;
                        let _dryActive = this.DehumidifierService.getCharacteristic(Characteristic["Active"]).value;
                        if  (! ((this.mode === FAN && _fanActive === Characteristic.Active.ACTIVE) ||
                              (this.mode === DRY && _dryActive === Characteristic.Active.ACTIVE)))
                        {
                            _mode = AUTO;
                            //this.log(`We're in _mode=AUTO ${_mode}`);
                        }
                        break;
                    case Characteristic.TargetHeaterCoolerState.HEAT:
                            _mode = HEAT;
                            //this.log(`We're in _mode=HEAT ${_mode}`);
                        break;
                    case Characteristic.TargetHeaterCoolerState.COOL:
                            _mode = COOL;
                            //this.log(`We're in _mode=COOL ${_mode}`);
                        break;
            }
            
            this.log.debug(`We're sending this _mode to API `, _mode);
            this.vendorApi.setMode(_mode, this.log)
                .then(result => { // make sure all HomeKit services are upToDate
                    this.updateValue(this.DehumidifierService,"Active",Characteristic.Active.INACTIVE);
                    this.updateValue(this.FanService,"Active",Characteristic.Active.INACTIVE);
                    this.mode=_mode;
                    callback(null);
                })
                .catch(error => {
                    this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                    callback(error);
                });
        }
        
        //SetPoint
        if ( characteristicName === "CoolingThresholdTemperature" || characteristicName === "HeatingThresholdTemperature" ) {
            this.log.debug(`Request to set SetPoint to `, value)
            this.vendorApi.setSetPoint(value, this.log)
            .then(result => {
                callback(null);
            })
            .catch(error => {
                this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                callback(error);
            });
        }
        
        //RotationSpeed
        if ( characteristicName === "RotationSpeed" ) {
            let rSpeed = parseInt(value / STEPROTATIONSPEED); // 0 - 100 div 25
            this.vendorApi.setRotationSpeed(rSpeed, this.log)
            .then(result => {
                callback(null);
            })
            .catch(error => {
                this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                callback(error);
            });
        }
        
        //SwingMode
        if ( characteristicName === "SwingMode" ) {
            this.vendorApi.setSwingMode(value, this.vanePosition, this.log)
            .then(result => { // make sure all HomeKit services are upToDate
                this.updateValue(this.HeaterCoolerService,"SwingMode",value);
                this.updateValue(this.DehumidifierService,"SwingMode",value);
                this.updateValue(this.FanService,"SwingMode",value);
                callback(null);
            })
            .catch(error => {
                this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                callback(error);
            });
        }
        
        //LockPhysicalControls
        if ( characteristicName === "LockPhysicalControls" ) {
            this.vendorApi.setLockPhysicalControls(value, this.log)
            .then(result => { // make sure all HomeKit services are upToDate
                this.updateValue(this.HeaterCoolerService,"LockPhysicalControls",value);
                this.updateValue(this.DehumidifierService,"LockPhysicalControls",value);
                this.updateValue(this.FanService,"LockPhysicalControls",value);
                callback(null);
            })
            .catch(error => {
                this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                callback(error);
            });
        }
        
        //TargetHumidifierDehumidifierState - nothing to do here
        if ( characteristicName === "TargetHumidifierDehumidifierState" ) {
            callback(null);
        }
        
    }
    
    updateHomeKit (serviceName, characteristicName, callback) {
        this.log(`Update HomeKit: ${serviceName} ${characteristicName}`);
        
        //get the AC mode every time and use it below in the checks
        //let Mode
        //Mode = 3 // FAN TEST
        
        if ( characteristicName === "Active" ) {
        
        //on every Active call, retrieve the Mode as well
        this.vendorApi.getMode(this.log)
            .then(mode => {
                this.log.debug(`Successfully retrieved value for mode: `, mode);
                this.mode=mode;
            })
            .catch(error => {
                this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                callback(error);
            });
            
        this.vendorApi.getActive(this.log)
            .then(active => {
                this.log.debug(`Successfully retrieved value for ${characteristicName}: `, active);
                if (!active){ // not active, turn everything off in HomeKit
                    this.updateValue(this.HeaterCoolerService,"Active",Characteristic.Active.INACTIVE);
                    this.updateValue(this.DehumidifierService,"Active",Characteristic.Active.INACTIVE);
                    this.updateValue(this.FanService,"Active",Characteristic.Active.INACTIVE);
                    callback(null, Characteristic.Active.INACTIVE);
                }
                else { // AC is active
                    switch (this.mode) { // check the AC mode in order to see what switches need flipping in HomeKit
                            case AUTO:
                                //this.log("We're in AUTO");
                                this.updateValue(this.HeaterCoolerService,"Active",Characteristic.Active.ACTIVE);
                                this.updateValue(this.DehumidifierService,"Active",Characteristic.Active.INACTIVE);
                                this.updateValue(this.FanService,"Active",Characteristic.Active.INACTIVE);
                                if (serviceName === "HeaterCoolerService") {
                                    callback(null, Characteristic.Active.ACTIVE);
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE);
                                }
                                break;
                            case HEAT:
                                //this.log("We're in HEAT");
                                this.updateValue(this.HeaterCoolerService,"Active",Characteristic.Active.ACTIVE);
                                this.updateValue(this.DehumidifierService,"Active",Characteristic.Active.INACTIVE);
                                this.updateValue(this.FanService,"Active",Characteristic.Active.INACTIVE);
                                if (serviceName === "HeaterCoolerService") {
                                    callback(null, Characteristic.Active.ACTIVE);
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE);
                                }
                                break;
                            case DRY:
                                //this.log("We're in DRY");
                                this.updateValue(this.DehumidifierService,"Active",Characteristic.Active.ACTIVE);
                                this.updateValue(this.FanService,"Active",Characteristic.Active.INACTIVE);
                                this.updateValue(this.HeaterCoolerService,"Active",Characteristic.Active.INACTIVE);
                                if (serviceName === "DehumidifierService") {
                                    callback(null, Characteristic.Active.ACTIVE);
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE);
                                }
                                break;
                            case FAN:
                                //this.log("We're in FAN");
                                this.updateValue(this.FanService,"Active",Characteristic.Active.ACTIVE);
                                this.updateValue(this.DehumidifierService,"Active",Characteristic.Active.INACTIVE);
                                this.updateValue(this.HeaterCoolerService,"Active",Characteristic.Active.INACTIVE);
                                if (serviceName === "FanService") {
                                    callback(null, Characteristic.Active.ACTIVE);
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE);
                                }
                                break;
                            case COOL:
                                //this.log("We're in COOL");
                                this.updateValue(this.HeaterCoolerService,"Active",Characteristic.Active.ACTIVE);
                                this.updateValue(this.FanService,"Active",Characteristic.Active.INACTIVE);
                                this.updateValue(this.DehumidifierService,"Active",Characteristic.Active.INACTIVE);
                                if (serviceName === "HeaterCoolerService") {
                                    callback(null, Characteristic.Active.ACTIVE);
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE);
                                }
                                break;
                    }
                    // if nothing hit in the switch statement, it must be a service to inactivate
                    //callback(null, Characteristic.Active.INACTIVE)
                }
                
            })
            .catch(error => {
                this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                callback(error);
            });
       
        }
        
        if ( characteristicName === "SwingMode" ) {
            this.vendorApi.getSwingMode(this.log)
                .then(swingMode => {
                    this.log.debug(`Successfully retrieved value for ${characteristicName}: `, swingMode);
                    this.updateValue(this.HeaterCoolerService,"SwingMode",swingMode);
                    this.updateValue(this.DehumidifierService,"SwingMode",swingMode);
                    this.updateValue(this.FanService,"SwingMode",swingMode);
                    callback(null, swingMode);
                })
                .catch(error => {
                    this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                    callback(error);
                });
        }
        
        if ( characteristicName === "RotationSpeed" ) {
            this.vendorApi.getRotationSpeed(this.log)
                .then(rotationSpeed => {
                    let rSpeed = rotationSpeed * STEPROTATIONSPEED; // [1,2,3,4] * 25
                    this.log.debug(`Successfully retrieved value for ${characteristicName}: `, rSpeed);
                    this.updateValue(this.HeaterCoolerService,"RotationSpeed",rSpeed);
                    this.updateValue(this.DehumidifierService,"RotationSpeed",rSpeed);
                    this.updateValue(this.FanService,"RotationSpeed",rSpeed);
                    callback(null, rSpeed);
                })
                .catch(error => {
                    this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                    callback(error);
                });
        }
        
        if ( characteristicName === "LockPhysicalControls" ) {
            this.vendorApi.getLockPhysicalControls(this.log)
                .then(lockPhysicalControls => {
                    this.log.debug(`Successfully retrieved value for ${characteristicName}: `, lockPhysicalControls);
                    this.updateValue(this.HeaterCoolerService,"LockPhysicalControls",lockPhysicalControls);
                    this.updateValue(this.DehumidifierService,"LockPhysicalControls",lockPhysicalControls);
                    this.updateValue(this.FanService,"LockPhysicalControls",lockPhysicalControls);
                    callback(null, lockPhysicalControls);
                })
                .catch(error => {
                    this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                    callback(error);
                });
        }
        
        if ( characteristicName == "CoolingThresholdTemperature" || characteristicName === "HeatingThresholdTemperature" ) {
            this.vendorApi.getSetPoint(this.log)
                .then(SetPoint => {
                    this.log.debug(`Successfully retrieved value for ${characteristicName}: `, SetPoint);
                        if (SetPoint === 3276.8) { // account for bug of ACWM API SetPoint value when in FAN mode
                        SetPoint = 23;// set to 23 degrees
                    }
                    callback(null, SetPoint);
                })
                .catch(error => {
                    this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                    callback(error);
                });
        }
        
        //if ( characteristicName === "TargetHeaterCoolerState" || characteristicName === "CurrentHeaterCoolerState") {
        if ( characteristicName === "TargetHeaterCoolerState" ) {
            switch (this.mode) {
                    case AUTO:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.TargetHeaterCoolerState.AUTO);
                        callback(null, Characteristic.TargetHeaterCoolerState.AUTO);
                        break;
                    case HEAT:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.TargetHeaterCoolerState.HEAT);
                        callback(null, Characteristic.TargetHeaterCoolerState.HEAT);
                        break;
                    case DRY:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.TargetHeaterCoolerState.AUTO);
                        callback(null, Characteristic.TargetHeaterCoolerState.AUTO);
                        break;
                    case FAN:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.TargetHeaterCoolerState.AUTO);
                        callback(null, Characteristic.TargetHeaterCoolerState.AUTO);
                        break;
                    case COOL:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.TargetHeaterCoolerState.COOL);
                        callback(null, Characteristic.TargetHeaterCoolerState.COOL);
                        break;
            }
        }
        
        if ( characteristicName === "CurrentHeaterCoolerState" ) {
            switch (this.mode) {
                    case AUTO:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.CurrentHeaterCoolerState.IDLE);
                        callback(null, Characteristic.CurrentHeaterCoolerState.IDLE); // needs to have setpoint and currenttemp checked!!!
                        break;
                    case HEAT:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.CurrentHeaterCoolerState.HEATING);
                        callback(null, Characteristic.CurrentHeaterCoolerState.HEATING);
                        break;
                    case DRY:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.CurrentHeaterCoolerState.IDLE);
                        callback(null, Characteristic.CurrentHeaterCoolerState.IDLE);
                        break;
                    case FAN:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.CurrentHeaterCoolerState.IDLE);
                        callback(null, Characteristic.CurrentHeaterCoolerState.IDLE);
                        break;
                    case COOL:
                        this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.CurrentHeaterCoolerState.COOLING);
                        callback(null, Characteristic.CurrentHeaterCoolerState.COOLING);
                        break;
            }
        }
        
        if ( characteristicName === "CurrentTemperature" ) {
            this.vendorApi.getCurrentTemperature(this.log)
                .then(currentTemperature => {
                    this.log.debug(`Successfully retrieved value for ${characteristicName}: `,currentTemperature);
                    callback(null, currentTemperature);
                })
                .catch(error => {
                    this.log.error(`Error occured while setting value for ${characteristicName}: `, error);
                    callback(error);
                });
        }
        
        if (characteristicName === "CurrentHumidifierDehumidifierState") {
            //this.log(`Successfully retrieved value for ${characteristicName}: ${Characteristic.CurrentHumidifierDehumidifierState.INACTIVE}`)
            if ( this.mode === DRY ) {
                callback(null, Characteristic.CurrentHumidifierDehumidifierState.DEHUMIDIFYING);
            }
            else {
                callback(null, Characteristic.CurrentHumidifierDehumidifierState.INACTIVE);
            }
        }
        
        //always DEHUMIDIFIER
        if (characteristicName === "TargetHumidifierDehumidifierState") {
            this.log.debug(`Successfully retrieved value for ${characteristicName}: `, Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER);
            callback(null, Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER);
        }
        
        // MHI AC does not return hum, always set to 50%
        if ( characteristicName === "CurrentRelativeHumidity") {
            this.log.debug(`Successfully retrieved value for ${characteristicName}: `, "50%");
            callback(null, 50.0);
        }
        
    }
    
    updateValue (service, characteristicName, newValue) {
           if (service.getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
                service.getCharacteristic(Characteristic[characteristicName]).updateValue(newValue);
                this.log.debug(`Updated "${characteristicName}" for ${service} with NEW VALUE: `, newValue);
          }
    }
}
