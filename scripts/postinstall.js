const { spawn } = require("cross-spawn");

if (process.platform === "linux") {
  spawn("cp", ["-r", "./fixs/", "./node_modules/"]);
} else {
  spawn("xcopy", [".\\fixs\\", ".\\node_modules\\", "/E", "/I", "/Y"]);
}
