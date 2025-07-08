/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
      config.resolve.fullySpecified = false;
      return config;
    },
    transpilePackages: ['@zxing/browser'],
  };
  
  module.exports = nextConfig;