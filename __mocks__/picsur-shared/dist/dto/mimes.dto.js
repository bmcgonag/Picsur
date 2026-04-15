import { z } from 'zod';

export function ParseMime2FileType(type) {
  return type;
}

export const FileType2Ext = {
  png: '.png',
  jpg: '.jpg',
  gif: '.gif',
  webp: '.webp',
  bmp: '.bmp',
  tiff: '.tiff',
  heif: '.heif',
  qoi: '.qoi',
  svg: '.svg',
};

export const Mime2FileType = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/heif': 'heif',
  'image/qoi': 'qoi',
};

export const ImageFileType = ['png', 'jpg', 'gif', 'webp', 'bmp', 'tiff', 'heif', 'qoi'];
export const AnimFileType = ['gif', 'webp'];
export const FileType = [...ImageFileType, 'svg'];
