const axios = require('axios');
const ipaddr = require('ipaddr.js');
import GeoLocationAddressObject from './geolocation-address-object.js';
import SocketAddress from 'common/sockets/protocol/extend-socket/Socket-Address'
import GeoHelper from 'node/lists/geolocation-lists/geo-helpers/geo-helper'

class GeoLocationLists {

    /*
        geoLocationContinentsLists = {}
        countGeoLocationContinentsLists = 0
     */

    constructor(){

        console.log("GeoLocations constructor");

        this.geoLocationContinentsLists = {};
        this.geoLocationLists = [];

        this.countGeoLocationContinentsLists = 0;


        this._pendingLocationLists = [];

        setTimeout(this._processGeoLocationPendingList.bind(this), 15000);
    }

    async _processGeoLocationPendingList(){

        if (this._pendingLocationLists.length > 0) {

            let data = this._pendingLocationLists[0];
            this._pendingLocationLists.splice(0,1);

            let location = await GeoHelper.getLocationFromAddress(data.address);

            if (location === null || location === undefined){
                //console.warn("LOCATION was not been able to get");
                return null;
            }

            location.continent = location.continent || '--';

            this._addGeoLocationContinentByAddress( data.address, location );

            try {
                data.resolver(location);
            } catch (exception){
            }

        }




        setTimeout(this._processGeoLocationPendingList.bind(this), 5000);

    }

    async _includeAddress(sckAddress, port){

        sckAddress = SocketAddress.createSocketAddress(sckAddress, port);

        for (let i=0; i<this._pendingLocationLists.length; i++)
            if (this._pendingLocationLists[i].address.matchAddress(sckAddress))
                return this._pendingLocationLists[i].promise;

        let resolver;
        let promise = new Promise((resolve)=>{
            resolver = resolve;
        });

        let data = {
            address: sckAddress,
            promise: promise,
            resolver: resolver,
        };

        this._pendingLocationLists.push(data);

        return data;
    }

    async includeSocket(socket){

        if ( socket === undefined || socket === null) return null;

        //in case the location has been set before  (avoiding double insertion)
        if ( socket.node !== undefined &&  socket.node.location !== undefined && socket.node.location !== null) return socket.node.location;

        let data = await this._includeAddress(socket.node.sckAddress);
        socket.node.location = data.promise;

        return data.promise;

    }

    _addGeoLocationContinentByAddress(sckAddress, location){

        sckAddress = SocketAddress.createSocketAddress(sckAddress);


        if (this._searchGeoLocationContinentByAddress(sckAddress) === null) {

            if ( this.geoLocationContinentsLists[location.continent] === undefined) this.geoLocationContinentsLists[location.continent] = [];

            let geoLocationAddressObject = new GeoLocationAddressObject(sckAddress, undefined, location);
            geoLocationAddressObject.refreshLastTimeChecked();

            if (this.geoLocationContinentsLists.hasOwnProperty(location.continent))
                this.geoLocationContinentsLists[location.continent] = [];

            this.geoLocationContinentsLists[location.continent].push(geoLocationAddressObject);
            this.countGeoLocationContinentsLists += 1;
        }

        this.printGeoLocationContinentsLists();

        return location.continent;
    }

    _searchGeoLocationContinentByAddress(sckAddress){

        for (let continent in this.geoLocationContinentsLists)
            if (this.geoLocationContinentsLists.hasOwnProperty(continent))
                for (let i=0; i<this.geoLocationContinentsLists[continent].length; i++) {

                    if (this.geoLocationContinentsLists[continent][i].sckAddress.matchAddress(sckAddress))
                        return continent;
                }

        return null;
    }

    printGeoLocationContinentsLists(){

        for (let continent in this.geoLocationContinentsLists)
            if (this.geoLocationContinentsLists.hasOwnProperty(continent)) {

                let listString = '';
                for (let i = 0; i < this.geoLocationContinentsLists[continent].length; i++) {
                    listString += this.geoLocationContinentsLists[continent][i].toString()+ "   ,   ";
                }

            }
    }

}

export default new GeoLocationLists();