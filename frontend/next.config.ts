import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.AMPLIFY_MONOREPO_APP_ROOT ? undefined : "standalone",
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
