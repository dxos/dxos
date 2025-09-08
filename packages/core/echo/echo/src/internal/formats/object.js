"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoLocation = exports.GeoPoint = void 0;
var effect_1 = require("effect");
var util_1 = require("@dxos/util");
var types_1 = require("./types");
/**
 * GeoJSON Format
 * https://datatracker.ietf.org/doc/html/rfc7946
 * https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.1
 * https://en.wikipedia.org/wiki/Geographic_coordinate_system
 * https://geojson.org
 * {
 *   "type": "Point",
 *   "coordinates": [0, 51.47] // [longitude, latitude]
 * }
 * Note: optional third element for altitude.
 */
exports.GeoPoint = effect_1.Schema.Tuple(effect_1.Schema.Number.pipe(effect_1.Schema.clamp(-180, 180), effect_1.Schema.multipleOf(0.00001)).annotations({
    title: 'Longitude',
}), effect_1.Schema.Number.pipe(effect_1.Schema.clamp(-90, 90), effect_1.Schema.multipleOf(0.00001)).annotations({
    title: 'Latitude',
}), effect_1.Schema.optionalElement(effect_1.Schema.Number).annotations({
    title: 'Height ASL (m)',
})).pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.GeoPoint), effect_1.Schema.annotations({
    title: 'GeoPoint',
    description: 'GeoJSON Position',
}));
/**
 * Geolocation utilities for working with GeoPoint format.
 */
var GeoLocation;
(function (GeoLocation) {
    /**
     * Convert latitude and longitude to GeoPoint (GeoJSON format [longitude, latitude, height?]).
     * Clamps values to valid ranges: latitude [-90, 90], longitude [-180, 180].
     */
    GeoLocation.toGeoPoint = function (_a) {
        var longitude = _a.longitude, latitude = _a.latitude, height = _a.height;
        // TODO(ZaymonFC): Use schema validation instead of doing this manually.
        var clampedLongitude = (0, util_1.clamp)(longitude, -180, 180);
        var clampedLatitude = (0, util_1.clamp)(latitude, -90, 90);
        return height !== undefined ? [clampedLongitude, clampedLatitude, height] : [clampedLongitude, clampedLatitude];
    };
    /**
     * Extract latitude and longitude from GeoPoint (GeoJSON format [longitude, latitude, height?]).
     */
    GeoLocation.fromGeoPoint = function (geoPoint) {
        if (!geoPoint) {
            return { longitude: 0, latitude: 0 };
        }
        var result = {
            longitude: geoPoint[0],
            latitude: geoPoint[1],
        };
        // Add height if defined.
        if (geoPoint[2] !== undefined) {
            result.height = geoPoint[2];
        }
        return result;
    };
})(GeoLocation || (exports.GeoLocation = GeoLocation = {}));
