(function (root) {
  'use strict';
  // Geocoding is performed by Google Maps when the requested address is opened.
  // A text search result is not a verified cadastral/geospatial coordinate.
  function linksForAddress(value) {
    if (typeof value !== 'string') return null;
    const address = value.trim().slice(0, 500);
    if (!address) return null;
    const q = encodeURIComponent(address);
    return {
      search: 'https://www.google.com/maps/search/?api=1&query=' + q,
      embed: 'https://maps.google.com/maps?q=' + q + '&t=m&z=16&hl=vi&output=embed'
    };
  }
  const api = Object.freeze({linksForAddress});
  root.TAXMAP_MAP = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
