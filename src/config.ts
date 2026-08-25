import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-volunteer-desk",
  displayName: "Volunteer Desk",
  visualProfile: "field",
  shellLayout: "inset",
  description:
    "A browser-local field desk for reserving volunteer seats and coordinating assignments.",
  accentHex: "#d9b354",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
