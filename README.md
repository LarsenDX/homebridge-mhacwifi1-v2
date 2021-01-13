# homebridge-mhacwifi1-v2
homebridge plugin for Mitsubishi Heavy Industries AC equipped with an Intesis MH-AC-WIFI-1 device (LAN API). This plugin implements all supported HomeKit services: Heater Cooler (AUTO, HEAT, COOL), Fanv2 (FAN), and Humidifier Dehumidifier (DRY), including RotationSpeed, SwingMode.


# config.json example

"accessories": [  
{  
"accessory": "MHI-AC",  
"name": "Living Room Aircon",  
"ip": "192.168.1.10",  
"username": "operator",  
"password": "operator",  
"serial": "CC3F1D02XXXX",  
"vaneposition":1  
}]  
  
Note: It's recommended to name the device *Aircon* to allow Siri to better distinguish between the AC and a thermostat (e.g. heater) assigned to the same room.
