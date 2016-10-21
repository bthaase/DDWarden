# DDWarden
NodeJS-based netflow collector, designed for non-commercial work - specifically with DD-WRT Routers.

![Screenshots](https://github.com/bthaase/DDWarden/raw/master/screenshots/Screenshots.PNG "Screenshots")
[Click here to see screenshots of DDWarden.](https://github.com/bthaase/DDWarden/blob/master/SCREENSHOTS.md)

## How does it work?
DDWarden is written in NodeJS. It acts as an RFlow and MACupd collector for use with DD-WRT Routers to gather information about network traffic between your local devices and the WAN interface. The vast majority of the netflow data is discarded, as this tool is only intended to give you a traffic breakdown per device, over a given timeframe. This allows us to keep the database small as well. Collected stats are stored in a SQLite3 database.

Traffic information is recorded every minute, and the device reporting page can give small increment views (last 5 minutes, 10 minutes, etc) - Every hour, the previous hours information is compacted into a single hour-long traffic record for each device, allowing us to store long-term data without creating a massive database.

The reporting interface is AngularJS 1.5 and collects information from the Node application to render it's graphs and data views. 

## Requirements
Warden has been tested in NodeJS v5.4.1 and higher. 

## Installing on Docker
You can install and run DDWarden on a Docker host (including Synology systems with an x86 core) with a minimal of pain and effort.

You will need a few pieces of information to replace in the following command.
- TZ={timezone}: Make sure you replace {timezone} with your local, linux-valid timezone, or the logging will be skewed.
- /database volume: Map this to a local volume of your choice, this is where the sqlite database will be stored.

The ports will be mapped to 8020, 2055, and 2056. You can alter these if you wish, just remember to use the altered ports when configuring your router as well.

```
docker run -d --name="DDWarden" -e TZ=America/Los_Angeles -v /docker/ddwarden:/database:rw -v /etc/localtime:/etc/localtime:ro -p 8020:8020 -p 2055:2055/udp -p 2056:2056/udp bthaase/ddwarden
```

The latest image can be located on the [Docker Hub](https://hub.docker.com/r/bthaase/ddwarden/).

## Manual Installation
- Clone the branch to a local directory.
- In the root application directory, run 'npm install' to download the necessary node modules.
- Change the database filename or ports in config/config.json (if you so desire - the defaults are usually good)
- Run 'node index.js' to launch the application. 
- Follow the steps below under 'Configuring the Router' to start collecting data.

You will likely want to create an Upstart script or similar to ensure the application boots at system startup.

In the near future, I intend to have a Docker install file as well. 

## Application Configuration
The configuration file can be located under 'config/config.json' and contains the following settings:
* RFLOW_PORT: Which port is the RFlow listener on. (Default is 2055)
* MACUPD_PORT: Which port is the MACupd listener on. (Default is 2056)
* HTTP_PORT: Which port is the reporting web server on. (Default is 8020)
* DATABASE_FILENAME: The filename where we want to store our SQLite3 database. (Default is './dd-warden.db')

## Environmental Variables
If you wish, you can also override the config.json with environmental variables. They are as follows:
* DDWARDEN_RFLOW_PORT: Which port is the RFlow listener on. (Default is 2055)
* DDWARDEN_MACUPD_PORT: Which port is the MACupd listener on. (Default is 2056)
* DDWARDEN_HTTP_PORT: Which port is the reporting web server on. (Default is 8020)
* DDWARDEN_DATABASE: The filename where we want to store our SQLite3 database. (Default is './dd-warden.db')

## Configuring your Router
Once the Warden application is running, you will need to change some settings on your DD-WRT Router to forward the netflow traffic to Warden.

- Login to your DD-WRT Router.
- Click the 'Services' tab.
- Scroll down to 'RFlow / MACupd'
- Enable RFlow and MACupd - BOTH Services are required to use Warden.
- Set the 'Server IP' to the local IP address of the machine hosting Warden.
- Make sure the 'Port' fields match your Warden config file for RFLOW_PORT and MACUPD_PORT.
- Interface and Interval are fine at defaults. (LAN & WLAN, 10 second intervals)
- Scroll to the bottom and click "Apply Settings"

After about a minute, you should be able to refresh the Warden web interface to see some devices and traffic stats being recorded. (You may need to request an external website first to generate some WAN traffic)

![DDWRT-Config](https://github.com/bthaase/DDWarden/raw/master/screenshots/DDWRT_Config.png "DD-WRT Example Configuration")

## Known Issues
- Currently the 'monthly data cap' is hardcoded at 1 TB, this will be resolved when the internal settings page is completed.
- Settings and About page are currently unimplemented. 
