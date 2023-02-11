const fs = require('fs');
const path = require('path');

const source = 'fixs';
const destination = 'node_modules';

function copyFolderSync(source, destination) {
  const files = fs.readdirSync(source);

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination);
  }

  for (const file of files) {
    const curSource = path.join(source, file);
    const curDestination = path.join(destination, file);

    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderSync(curSource, curDestination);
    } else {
      fs.copyFileSync(curSource, curDestination);
    }
  }
}

copyFolderSync(source, destination);