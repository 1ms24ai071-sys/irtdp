const fs = require('fs');

const fixDockerfile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  
  if (!code.includes('apk add --no-cache python3 make g++ vips-dev')) {
    code = code.replace(/COPY package\*\.json \.\//g, `COPY package*.json ./\nRUN apk add --no-cache python3 make g++ vips-dev`);
    fs.writeFileSync(filePath, code);
  }
};

fixDockerfile('services/media-service/Dockerfile');
fixDockerfile('services/processing-service/Dockerfile');

console.log("Dockerfiles patched for sharp");
