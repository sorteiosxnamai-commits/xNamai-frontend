const fs = require("fs");

const packagePath = "node_modules/webpack/node_modules/eslint-scope/package.json";

if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  if (pkg.exports) {
    delete pkg.exports;
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log("patched eslint-scope exports", pkg.version);
  } else {
    console.log("eslint-scope exports already patched", pkg.version);
  }
} else {
  console.log("eslint-scope package not found, skipping patch");
}
