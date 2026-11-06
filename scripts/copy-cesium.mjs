// Copies the prebuilt CesiumJS bundle (and its offline Natural Earth imagery) into public/cesium.
import { cpSync, existsSync, mkdirSync } from "node:fs";
const src = "node_modules/cesium/Build/Cesium";
if (!existsSync(src)) { console.error("cesium not installed"); process.exit(1); }
mkdirSync("public/cesium", { recursive: true });
for (const d of ["Cesium.js", "Workers", "ThirdParty", "Assets", "Widgets"]) cpSync(`${src}/${d}`, `public/cesium/${d}`, { recursive: true });
console.log("cesium copied");
