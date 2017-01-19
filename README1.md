# August Home Import Manufacturing Data 

####importingManufacturingDate.js:

The whole processing is in this file.

The Architecture of the application:

![alt tag](https://raw.githubusercontent.com/shivateja-madipalli/august-home-challenge/blob/new_changes/screenshots/Screen%20Shot%202017-01-18%20at%204.07.01%20PM.png)

The above Architecture explains a lot.

•	Take command line args and I use line-by-line package to read the contents of the file (I have used csv files).
•	While processing one line at a time, split with ‘,’ and check if all Headers are present, if any (ignore:false) header is missing then I am aborting the process.
•	If all the headers are present, sanity check for different fields (dependent on the device config) will take place to check if all the fields are within the specified criteria.
•	If Serial Number is available in previous records, then the error message is shown and process is aborted.
•	If Serial Number is not available in previous records, then it will be inserted first and the serial number is used as key for other records.


Example:
Serial Number  q1w2e3r4t5y6u7
Other fields   q1w2e3r4t5y6u7: other field value
•	The collection name of serial number and all other fields are fetched from device type config.
•	Once all the data is inserted a message with success count, failure count and appropriate message are shown.



_Project Structure_

├── config
│   ├── configs
│   │   ├── connect.conf.json
│   │   ├── deviceType.js
│   │   └── doorbell.conf.json
│   ├── csv
│   │   ├── connect.csv
│   │   └── doorbell.csv
│   ├── driver.js
│   ├── getDeviceConfig.js
│   └── sanityCheck.js
├── importManufacturingData.js
├── old_files
│   ├── index.js
│   ├── old.js
│   ├── playground.js
│   └── updated.js
└── package.json

The tree structure above explains about the file structuring.

/config has all the configuration related file such as 

/csv  device csv files

getDeviceConfig.js  Is used for retrieving device config files.

/configs  has all config files and deviceType.js which provides api to retrieving and processing the data.

Important pointers:
•	A common database is used for all collections. The collection name would be the dbName from device config file.
•	Multiple devices with same fields data would be inserted in common collections.
•	Serial Number is used as the Primary Key.
•	
The provider's file's first line includes a headers line.

•	For each device type, the importManufacturingData will know what headers are expected through some configuration.

•	The system will abort if there is a missing required column.

•	The system will not import a row if some data doesn't match the specified criteria.



Limitations:
•	Currently, to import a config file, it should be placed in config/configs/ and need to be required in getDeviceConfig.js, where there is a switch case to return the appropriate config file per the device name.
•	File format is limited to csv files.

Future Enhancements:
•	The File format need not be restricted.
•	System can be made to accept any config file available just by placing at specified location.
•	Instead of collections, the data can be saved in individual database using connectionpool.


