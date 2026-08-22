import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "Mesh Volunteer Desk",
  description: "A browser-local capacity-safe volunteer shift desk.",
  accentHex: "#5e9cff",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
