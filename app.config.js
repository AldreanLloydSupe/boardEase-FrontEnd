const appJson = require("./app.json");

module.exports = ({ config }) => ({
  ...config,
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    eas: {
      projectId: "34d6d184-6f83-4c30-a671-caff57741cc7",
    },
  },
});
