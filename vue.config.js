module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        publish: [
          {
            provider: "github",
            owner: "sunflowr",
            repo: "pixiedust"
          }
        ]
      }
    }
  }
}