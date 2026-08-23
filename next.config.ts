import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // I casi vengono letti dal filesystem a runtime (mai importati, così la
  // soluzione non può finire in un bundle): il file va incluso nel deploy.
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
};

export default nextConfig;
