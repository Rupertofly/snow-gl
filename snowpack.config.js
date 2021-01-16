/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
    mount: {
        public: { url: '/', static: true },
        src: { url: '/dist' },
    },
    plugins: [
      ["snowpack-plugin-raw-file-loader", {
        exts: [".txt", ".md", ".svg", ".frag",".vert"], // Add file extensions saying what files should be loaded as strings in your snowpack application. Default: '.txt'
      }]
    ],
    packageOptions: {
        /* ... */
    },
    devOptions: {
        fallback: 'src/index.html',
        open: 'none',
    },
    buildOptions: {
        /* ... */
    },
    exclude: ['**/node_modules/**/*', './output'],
};
