/* MIT License
Copyright (c) 2020 Laurent Baum (larsendx)
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

'use strict'

const acwmApi = require("./acwm-api/acwm-api.js")
//const StateManager = require('./StateManager.js')
//var Service, Characteristic, HomebridgeAPI;
let Service, Characteristic
const PLUGIN_NAME = 'homebridge-mhacwifi1'//'homebridge-mhi-acwm'
const ACCESSORY_NAME = 'MH-AC-WIFI-1'//'MHI-ACWM-AC'
const MANUFACTURER = 'Mitsubishi Heavy Industries'
const MODEL = 'MH-AC-WIFI-1'
const MINTEMPSETPOINT = 18
const MAXTEMPSETPOINT = 30
const MINROTATIONSPEED = 0
const MAXROTATIONSPEED = 4

module.exports = (api) => {
  api.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, MhiAcAccessory);
}

/*
module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  HomebridgeAPI = homebridge;
  homebridge.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, MhiAcAccessory);
}
*/
 
class MhiAcAccessory {
    constructor(log, config, api) {
        
        Service = api.hap.Service
        Characteristic = api.hap.Characteristic
        
        this.acwmApiToHomeKitMap = {
            "Mode": {
                2 : Characteristic.CurrentHeaterCoolerState.IDLE, //dehumidify = DRY
                3 : Characteristic.CurrentHeaterCoolerState.IDLE, //fan
                4 : Characteristic.CurrentHeaterCoolerState.COOLING
            },
            "SwingMode": {
                0 : Characteristic.SwingMode.SWING_DISABLED,
                1 : Characteristic.SwingMode.SWING_DISABLED,
                2 : Characteristic.SwingMode.SWING_DISABLED,
                3 : Characteristic.SwingMode.SWING_DISABLED,
                4 : Characteristic.SwingMode.SWING_DISABLED,
                10 : Characteristic.SwingMode.SWING_ENABLED,
            }
        }
        
        this.log = log;
        //this.config = config;
        this.api = api; /*homebridge API*/
        this.manufacturer = MANUFACTURER;
        this.model = MODEL;
        this.serial = config['serial'] || '1234';
        this.username=config['username'] || 'operator';
        this.password=config['password'] || 'operator';
        this.ip=config['ip'];
        this.displayName=config['name'];
        this.mode = 0 // start off with AUTO

        // Intesis (=MHI supplier) LAN API
        this.vendorApi = new acwmApi(this.ip, this.username, this.password);
        
        this.minTempSetPoint = MINTEMPSETPOINT
        this.maxTempSetPoint = MAXTEMPSETPOINT
        
        
        //State Manager of this accessory
        //this.stateManager = require('./StateManager')(this, api);
    
        // HAP AccessoryInformation service
        this.informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer,this.manufacturer)
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);
        
        //////////////////////////
        //HAP HeaterCooler service
        /////////////////////////
        this.HeaterCoolerService = new Service.HeaterCooler(this.displayName + ' Heater Cooler')
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.Active)
            .on('get', callback => { this.updateHomeKit('HeaterCoolerService', 'Active', callback) })
            .on('set', (value, callback) => { this.updateMHIAC('HeaterCoolerService', 'Active', value, callback) })
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
            .on('get', callback => { this.updateHomeKit('HeaterCoolerService','CurrentHeaterCoolerState',callback) })
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
            .on('get', callback => { this.updateHomeKit('HeaterCoolerService','TargetHeaterCoolerState',callback) })
            .on('set', (value, callback) => { this.updateMHIAC('HeaterCoolerService', 'TargetHeaterCoolerState', value, callback) })
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', callback => { this.updateHomeKit('HeaterCoolerService', 'CurrentTemperature', callback) })
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: MINROTATIONSPEED,
                maxValue: MAXROTATIONSPEED,
                minStep: 1
            })
            .on('get', callback => { this.updateHomeKit('HeaterCoolerService','RotationSpeed',callback) })
            .on('set', (value, callback) => { this.updateMHIAC('HeaterCoolerService', 'RotationSpeed', value, callback) })
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.SwingMode)
            .on('get', callback => { this.updateHomeKit('HeaterCoolerService','SwingMode',callback) })
            .on('set', (value, callback) => { this.updateMHIAC('HeaterCoolerService', 'SwingMode', value, callback) })
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.LockPhysicalControls)
            .on('get', callback => { this.updateHomeKit('HeaterCoolerService','LockPhysicalControls',callback) })
            .on('set', (value, callback) => { this.updateMHIAC('HeaterCoolerService', 'LockPhysicalControls', value, callback) })
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: MINTEMPSETPOINT,
                maxValue: MAXTEMPSETPOINT,
                minStep: 1
            })
            .on('get', callback => { this.updateHomeKit('HeaterCoolerService','CoolingThresholdTemperature',callback) })
            .on('set', (value, callback) => { this.updateMHIAC('HeaterCoolerService', 'CoolingThresholdTemperature', value, callback) })
        
        this.HeaterCoolerService.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .setProps({
                minValue: MINTEMPSETPOINT,
                maxValue: MAXTEMPSETPOINT,
                minStep: 1
            })
            .on('get', callback => { this.updateHomeKit('HeaterCoolerService','HeatingThresholdTemperature',callback) })
            .on('set', (value, callback) => { this.updateMHIAC('HeaterCoolerService', 'HeatingThresholdTemperature', value, callback) })
        
        ////////////////////////////
        //HAP HumidifierDehumidifier
        ////////////////////////////
        this.DehumidifierService = new Service.HumidifierDehumidifier(this.displayName + ' Dehumidifier')
            
        this.DehumidifierService.getCharacteristic(Characteristic.Active)
            .on('get', callback => { this.updateHomeKit('DehumidifierService', 'Active', callback) })
            .on('set', (value, callback) => { this.updateMHIAC('DehumidifierService', 'Active', value, callback) })
        
        this.DehumidifierService.getCharacteristic(Characteristic.CurrentHumidifierDehumidifierState)
            .on('get', callback => { this.updateHomeKit('DehumidifierService', 'CurrentHumidifierDehumidifierState', callback) })
        
        this.DehumidifierService.getCharacteristic(Characteristic.TargetHumidifierDehumidifierState)
            .setProps({
                minValue: 2,
                maxValue: 2,
                validValues: [Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER]
            })
            .on('get', callback => { this.updateHomeKit('DehumidifierService', 'TargetHumidifierDehumidifierState', callback) })
            .on('set', (value, callback) => { this.updateMHIAC('DehumidifierService', 'TargetHumidifierDehumidifierState', value, callback) })
        
        this.DehumidifierService.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: MINROTATIONSPEED,
                maxValue: MAXROTATIONSPEED,
                minStep: 1
            })
            .on('get', callback => { this.updateHomeKit('DehumidifierService','RotationSpeed',callback) })
            .on('set', (value, callback) => { this.updateMHIAC('DehumidifierService', 'RotationSpeed', value, callback) })
        
        this.DehumidifierService.getCharacteristic(Characteristic.SwingMode)
            .on('get', callback => { this.updateHomeKit('DehumidifierService', 'SwingMode', callback) })
            .on('set', (value, callback) => { this.updateMHIAC('DehumidifierService', 'SwingMode', value, callback) })
        
        this.DehumidifierService.getCharacteristic(Characteristic.LockPhysicalControls)
            .on('get', callback => { this.updateHomeKit('DehumidifierService', 'LockPhysicalControls', callback) })
            .on('set', (value, callback) => { this.updateMHIAC('DehumidifierService', 'LockPhysicalControls', value, callback) })
        
        this.DehumidifierService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', callback => { this.updateHomeKit('DehumidifierService', 'CurrentRelativeHumidity', callback) })
        
        ////////////////////////////
        //HAP FanV2 service
        ////////////////////////////
        this.FanService = new Service.Fanv2(this.displayName + ' Fan')
        
        this.FanService.getCharacteristic(Characteristic.Active)
            .on('get', callback => { this.updateHomeKit('FanService', 'Active', callback) })
            .on('set', (value, callback) => { this.updateMHIAC('FanService', 'Active', value, callback) })
        
        this.FanService.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                minValue: MINROTATIONSPEED,
                maxValue: MAXROTATIONSPEED,
                minStep: 1
            })
            .on('get', callback => { this.updateHomeKit('FanService','RotationSpeed',callback) })
            .on('set', (value, callback) => { this.updateMHIAC('FanService', 'RotationSpeed', value, callback) })
        
        this.FanService.getCharacteristic(Characteristic.SwingMode)
            .on('get', callback => { this.updateHomeKit('FanService', 'SwingMode', callback) })
            .on('set', (value, callback) => { this.updateMHIAC('FanService', 'SwingMode', value, callback) })
        
        this.FanService.getCharacteristic(Characteristic.LockPhysicalControls)
            .on('get', callback => { this.updateHomeKit('FanService', 'LockPhysicalControls', callback) })
            .on('set', (value, callback) => { this.updateMHIAC('FanService', 'LockPhysicalControls', value, callback) })
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
        this.log(`Update MHIAC: ${serviceName} ${characteristicName} ${value}`)
        callback(null)
    }
    
    updateHomeKit(serviceName, characteristicName, callback) {
        this.log(`Update HomeKit: ${serviceName} ${characteristicName}`)
        
        //get the AC mode every time and use it below in the checks
        //let Mode
        //Mode = 3 // FAN TEST
        /*
        this.vendorApi.getMode(this.log)
            .then(mode => {
                this.log(`Successfully retrieved value for mode: ${mode}`)
                Mode=mode
            })
            .catch(error => {
                this.log(`Error occured while getting value for ${characteristicName}: ${error}`)
                callback(error)
            })
        */
        if ( characteristicName === 'Active' ) {
        
        //on very Active call, retrieve the Mode as well
        this.vendorApi.getMode(this.log)
            .then(mode => {
                this.log(`Successfully retrieved value for mode: ${mode}`)
                this.mode=mode
            })
            .catch(error => {
                this.log(`Error occured while getting value for ${characteristicName}: ${error}`)
                callback(error)
            })
            
        this.vendorApi.getActive(this.log)
            .then(active => {
                this.log(`Successfully retrieved value for ${characteristicName}: ${active}`)
                if (!active){ // not active, turn everything off in HomeKit
                    this.updateValue(this.HeaterCoolerService,'Active',Characteristic.Active.INACTIVE)
                    this.updateValue(this.DehumidifierService,'Active',Characteristic.Active.INACTIVE)
                    this.updateValue(this.FanService,'Active',Characteristic.Active.INACTIVE)
                    callback(null, Characteristic.Active.INACTIVE)
                }
                else { // AC is active
                    switch (this.mode) { // check the AC mode in order to see what switches need flipping in HomeKit
                            case 0: //AUTO
                                this.log("We're in AUTO")
                                this.updateValue(this.HeaterCoolerService,'Active',Characteristic.Active.ACTIVE)
                                this.updateValue(this.DehumidifierService,'Active',Characteristic.Active.INACTIVE)
                                this.updateValue(this.FanService,'Active',Characteristic.Active.INACTIVE)
                                if (serviceName === 'HeaterCoolerService') {
                                    callback(null, Characteristic.Active.ACTIVE)
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE)
                                }
                                break;
                            case 1: //HEAT
                                this.log("We're in HEAT")
                                this.updateValue(this.HeaterCoolerService,'Active',Characteristic.Active.ACTIVE)
                                this.updateValue(this.DehumidifierService,'Active',Characteristic.Active.INACTIVE)
                                this.updateValue(this.FanService,'Active',Characteristic.Active.INACTIVE)
                                if (serviceName === 'HeaterCoolerService') {
                                    callback(null, Characteristic.Active.ACTIVE)
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE)
                                }
                                break;
                            case 2: //DRY
                                this.log("We're in DRY")
                                this.updateValue(this.DehumidifierService,'Active',Characteristic.Active.ACTIVE)
                                this.updateValue(this.FanService,'Active',Characteristic.Active.INACTIVE)
                                this.updateValue(this.HeaterCoolerService,'Active',Characteristic.Active.INACTIVE)
                                if (serviceName === 'DehumidifierService') {
                                    callback(null, Characteristic.Active.ACTIVE)
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE)
                                }
                                break;
                            case 3: //FAN
                                this.log("We're in FAN")
                                this.updateValue(this.FanService,'Active',Characteristic.Active.ACTIVE)
                                this.updateValue(this.DehumidifierService,'Active',Characteristic.Active.INACTIVE)
                                this.updateValue(this.HeaterCoolerService,'Active',Characteristic.Active.INACTIVE)
                                if (serviceName === 'FanService') {
                                    callback(null, Characteristic.Active.ACTIVE)
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE)
                                }
                                break;
                            case 4: // COOL
                                this.log("We're in COOL")
                                this.updateValue(this.HeaterCoolerService,'Active',Characteristic.Active.ACTIVE)
                                this.updateValue(this.FanService,'Active',Characteristic.Active.INACTIVE)
                                this.updateValue(this.DehumidifierService,'Active',Characteristic.Active.INACTIVE)
                                if (serviceName === 'HeaterCoolerService') {
                                    callback(null, Characteristic.Active.ACTIVE)
                                }
                                else {
                                    callback(null, Characteristic.Active.INACTIVE)
                                }
                                break;
                    }
                    // if nothing hit in the switch statement, it must be a service to inactivate
                    //callback(null, Characteristic.Active.INACTIVE)
                }
                
            })
            .catch(error => {
                this.log(`Error occured while getting value for ${characteristicName}: ${error}`)
                callback(error)
            })
       
        }
        
        if ( characteristicName === 'SwingMode' ) {
            this.vendorApi.getSwingMode(this.log)
                .then(swingMode => {
                    this.log(`Successfully retrieved value for ${characteristicName}: ${swingMode}`)
                    this.updateValue(this.HeaterCoolerService,'SwingMode',this.acwmApiToHomeKitMap['SwingMode'][swingMode])
                    this.updateValue(this.DehumidifierService,'SwingMode',this.acwmApiToHomeKitMap['SwingMode'][swingMode])
                    this.updateValue(this.FanService,'SwingMode',this.acwmApiToHomeKitMap['SwingMode'][swingMode])
                    callback(null, this.acwmApiToHomeKitMap['SwingMode'][swingMode])
                })
                .catch(error => {
                    this.log(`Error occured while getting value for ${characteristicName}: ${error}`)
                    callback(error)
                })
        }
        
        if ( characteristicName === 'RotationSpeed' ) {
            this.vendorApi.getRotationSpeed(this.log)
                .then(rotationSpeed => {
                    this.log(`Successfully retrieved value for ${characteristicName}: ${rotationSpeed}`)
                    this.updateValue(this.HeaterCoolerService,'RotationSpeed',rotationSpeed)
                    this.updateValue(this.DehumidifierService,'RotationSpeed',rotationSpeed)
                    this.updateValue(this.FanService,'RotationSpeed',rotationSpeed)
                    callback(null, rotationSpeed)
                })
                .catch(error => {
                    this.log(`Error occured while getting value for ${characteristicName}: ${error}`)
                    callback(error)
                })
        }
        
        if ( characteristicName === 'LockPhysicalControls' ) {
            this.vendorApi.getLockPhysicalControls(this.log)
                .then(lockPhysicalControls => {
                    this.log(`Successfully retrieved value for ${characteristicName}: ${lockPhysicalControls}`)
                    this.updateValue(this.HeaterCoolerService,'LockPhysicalControls',lockPhysicalControls)
                    this.updateValue(this.DehumidifierService,'LockPhysicalControls',lockPhysicalControls)
                    this.updateValue(this.FanService,'LockPhysicalControls',lockPhysicalControls)
                    callback(null, lockPhysicalControls)
                })
                .catch(error => {
                    this.log(`Error occured while getting value for ${characteristicName}: ${error}`)
                    callback(error)
                })
        }
        
        if ( characteristicName == 'CoolingThresholdTemperature' || characteristicName === 'HeatingThresholdTemperature' ) {
            this.vendorApi.getSetPoint(this.log)
                .then(setPoint => {
                    this.log(`Successfully retrieved value for ${characteristicName}: ${setPoint}`)
                    if (setPoint === 32768) { // account for bug of ACWM API SetPoint value when in FAN mode
                        setPoint = 230 // set to 23 degrees
                    }
                    callback(null, this.acwmToHomeKitTemp(setPoint))
                })
                .catch(error => {
                    this.log(`Error occured while getting value for ${characteristicName}: ${error}`)
                    callback(error)
                })
        }
        
        //if ( characteristicName === 'TargetHeaterCoolerState' || characteristicName === 'CurrentHeaterCoolerState') {
        if ( characteristicName === 'TargetHeaterCoolerState' ) {
            /*
            this.vendorApi.getMode(this.log)
                .then(mode => {
                    this.log(`Successfully retrieved value for ${characteristicName}: ${mode}`)
                    if (mode === 0 || mode === 1) { //auto or heating
                        this.updateValue(this.DehumidifierService,'Active',Characteristic.Active.INACTIVE)
                        this.updateValue(this.FanService,'Active',Characteristic.Active.INACTIVE)
                        callback(null, mode)
                    }
                })
                .catch(error => {
                    this.log(`Error occured while getting value for ${characteristicName}: ${error}`)
                    callback(error)
                })
            */
            switch (this.mode) {
                    case 0: //AUTO
                        callback(null, Characteristic.TargetHeaterCoolerState.AUTO)
                        break;
                    case 1: //HEAT
                        callback(null, Characteristic.TargetHeaterCoolerState.HEAT)
                        break;
                    case 2: //DRY
                        callback(null, Characteristic.TargetHeaterCoolerState.AUTO)
                        break;
                    case 3: //FAN
                        callback(null, Characteristic.TargetHeaterCoolerState.AUTO)
                        break;
                    case 4: //COOL
                        callback(null, Characteristic.TargetHeaterCoolerState.COOL)
                        break;
            }
        }
        
        if ( characteristicName === 'CurrentHeaterCoolerState' ) {
            switch (this.mode) {
                    case 0: //AUTO
                        callback(null, Characteristic.TargetHeaterCoolerState.COOLING) // needs to have setpoint and currenttemp checked!!!
                        break;
                    case 1: //HEAT
                        callback(null, Characteristic.CurrentHeaterCoolerState.HEATING)
                        break;
                    case 2: //DRY
                        callback(null, Characteristic.CurrentHeaterCoolerState.IDLE)
                        break;
                    case 3: //FAN
                        callback(null, Characteristic.CurrentHeaterCoolerState.IDLE)
                        break;
                    case 4: //COOL
                        callback(null, Characteristic.CurrentHeaterCoolerState.COOLING)
                        break;
            }
        }
        
        if ( characteristicName === 'CurrentTemperature' ) {
            this.vendorApi.getCurrentTemperature(this.log)
                .then(currentTemperature => {
                    this.log(`Successfully retrieved value for ${characteristicName}: ${currentTemperature}`)
                    callback(null, this.acwmToHomeKitTemp(currentTemperature))
                })
                .catch(error => {
                    this.log(`Error occured while getting value for ${characteristicName}: ${error}`)
                    callback(error)
                })
        }
        
        // disabled for now
        if (characteristicName === 'CurrentHumidifierDehumidifierState') {
            this.log(`Successfully retrieved value for ${characteristicName}: ${Characteristic.CurrentHumidifierDehumidifierState.INACTIVE}`)
            callback(null, Characteristic.CurrentHumidifierDehumidifierState.INACTIVE)
        }
        
        //always DEHUMIDIFIER
        if (characteristicName === 'TargetHumidifierDehumidifierState') {
            this.log(`Successfully retrieved value for ${characteristicName}: ${Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER}`)
            callback(null, Characteristic.TargetHumidifierDehumidifierState.DEHUMIDIFIER)
        }
        
        // MHI AC does not return hum, always set to 50%
        if ( characteristicName === 'CurrentRelativeHumidity') {
            this.log(`Successfully retrieved value for ${characteristicName}: 50%`)
            callback(null, 50.0)
        }
        
    }
    
    updateValue (service, characteristicName, newValue) {
           if (service.getCharacteristic(Characteristic[characteristicName]).value !== newValue) {
                service.getCharacteristic(Characteristic[characteristicName]).updateValue(newValue)
                this.log(`Updated '${characteristicName}' for ${service} with NEW VALUE: ${newValue}`)
          }
    }
                      
    acwmToHomeKitTemp (temp){
        let rTemp = parseInt(temp) / 10
        return rTemp
    }
    
    homeKitToAcwmTemp (temp, asString = false){
        let rTemp = temp * 10;
        return asString ? `${temp} degrees` : rTemp
    }
    
    
}
