const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * expo-notifications adds the `aps-environment` (remote push) entitlement, which
 * free Apple ID "Personal Team" signing rejects. LastRide only schedules local
 * notifications, so remote push is not needed. Remove this plugin if server
 * push is ever added (that also requires a paid Apple Developer account).
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
