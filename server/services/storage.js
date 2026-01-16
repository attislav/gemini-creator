const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const GENERATED_DIR = path.join(__dirname, '../../generated');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveBase64ToFile(base64Data, type, mimeType) {
  const extension = mimeType.split('/')[1] || (type === 'image' ? 'png' : 'mp4');
  const filename = `${type}_${Date.now()}_${uuidv4().slice(0, 8)}.${extension}`;
  const folder = type === 'image' ? 'images' : 'videos';
  const fullDir = path.join(GENERATED_DIR, folder);

  ensureDir(fullDir);

  const filePath = path.join(fullDir, filename);
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filePath, buffer);

  return {
    relativePath: `/generated/${folder}/${filename}`,
    absolutePath: filePath,
    fileSize: buffer.length
  };
}

function deleteFile(relativePath) {
  const absolutePath = path.join(__dirname, '../..', relativePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
    return true;
  }
  return false;
}

function getAbsolutePath(relativePath) {
  return path.join(__dirname, '../..', relativePath);
}

function readFileAsBase64(relativePath) {
  const absolutePath = getAbsolutePath(relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error('File not found');
  }
  const buffer = fs.readFileSync(absolutePath);
  return buffer.toString('base64');
}

module.exports = {
  saveBase64ToFile,
  deleteFile,
  getAbsolutePath,
  readFileAsBase64
};
