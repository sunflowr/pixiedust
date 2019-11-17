module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        appId: "se.obsolete.pixiedust",
        productName: "PixieDust",
        dmg: {
          contents: [
            {
              x: 410,
              y: 150,
              type: "link",
              path: "/Applications"
            },
            {
              x: 130,
              y: 150,
              type: "file"
            }
          ]
        },
        mac: {
          icon: "public/icon.icns",
          category: "Utility"
        },
        win: {
          icon: "public/icon.ico",
        },
        nsis: {
          deleteAppDataOnUninstall: true
        },
        linux: {
          icon: "public/bigicon.png",
          category: "Utility"
        },
        publish: [
          {
            provider: "github",
            owner: "sunflowr",
            repo: "pixiedust"
          }
        ],
        releaseInfo: {
        }
      }
    }
  }
}