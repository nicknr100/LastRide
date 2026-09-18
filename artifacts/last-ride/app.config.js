// Extends app.json. Free Apple ID signing ties a bundle ID to one person's team,
// so each developer can set their own in `.env.local`:
//   IOS_BUNDLE_ID=com.yourname.lastride
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || config.ios.bundleIdentifier,
  },
});
