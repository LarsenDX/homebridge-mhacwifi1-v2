# homebridge-mhacwifi1-v2
homebridge plugin for Mitsubishi Heavy Industries AC equipped with an Intesis MH-AC-WIFI-1 device (LAN API). This plugin implements all supported HomeKit services: Heater Cooler (AUTO, HEAT, COOL), Fanv2 (FAN), and Humidifier Dehumidifier (DRY), including RotationSpeed, SwingMode.


# config.json example

"accessories": [
        {
            "accessory": "MHI-AC",
            "name": "Living Room AC",
            "ip": "192.168.1.10",
            "username": "operator",
            "password": "operator",
            "serialNumber": "026129"
        }
