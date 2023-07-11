// Polyfill: BigInt.prototype.toJSON 

(function(global, undefined) {
    if (global.BigInt.prototype.toJSON === undefined) {
      global.Object.defineProperty(global.BigInt.prototype, "toJSON", {
          value: function() { return this.toString(); },
          configurable: true,
          enumerable: false,
          writable: true
      });
    }
  })(window !== void 0 ? window : typeof global !== void 0 ? global : typeof self !== void 0 ? self : this);