import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'wrr8h8yb',
    dataset: 'production',
  },
  deployment: {
    autoUpdates: true,
  },
})
