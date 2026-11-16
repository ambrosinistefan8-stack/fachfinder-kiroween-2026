import { markerBin } from './inventory.mjs';

export function scanPixels(decoder, imageData) {
  const { width, height } = imageData;
  const results = [];

  function scanWindow(originX, originY, edgeX, edgeY) {
    const windowWidth = edgeX - originX;
    const windowHeight = edgeY - originY;
    const pixels = new Uint8ClampedArray(windowWidth * windowHeight * 4);
    for (let row = 0; row < windowHeight; row += 1) {
      const start = ((originY + row) * width + originX) * 4;
      pixels.set(imageData.data.subarray(start, start + windowWidth * 4), row * windowWidth * 4);
    }

    scanWindowPixels(decoder, pixels, windowWidth, windowHeight, (bin, left, top, right, bottom) => {
      const mark = { bin, left: (originX + left) / width, top: (originY + top) / height, width: (right - left) / width, height: (bottom - top) / height };
      if (!results.some(item => item.bin === bin && Math.abs(item.left - mark.left) < .02 && Math.abs(item.top - mark.top) < .02)) results.push(mark);
    });
  }

  scanWindow(0, 0, width, height);
  // Multiple adjacent labels can confuse full-image finder-pattern grouping.
  // Overlapping crops separate nearby codes while keeping codes at crop edges visible.
  if (width >= 600 && height >= 360) {
    const columns = width >= height ? 3 : 2;
    const rows = width >= height ? 2 : 3;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        scanWindow(
          Math.floor(Math.max(0, column - .12) / columns * width),
          Math.floor(Math.max(0, row - .12) / rows * height),
          Math.ceil(Math.min(columns, column + 1.12) / columns * width),
          Math.ceil(Math.min(rows, row + 1.12) / rows * height)
        );
      }
    }
  }
  return results;
}

function scanWindowPixels(decoder, pixels, width, height, onMarker) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const scan = decoder(pixels, width, height, { inversionAttempts: 'attemptBoth' });
    if (!scan) break;

    const { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner } = scan.location;
    const corners = [topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner];
    const left = Math.max(0, Math.floor(Math.min(...corners.map(point => point.x))) - 4);
    const right = Math.min(width, Math.ceil(Math.max(...corners.map(point => point.x))) + 4);
    const top = Math.max(0, Math.floor(Math.min(...corners.map(point => point.y))) - 4);
    const bottom = Math.min(height, Math.ceil(Math.max(...corners.map(point => point.y))) + 4);
    const bin = markerBin(scan.data);
    if (bin) onMarker(bin, left, top, right, bottom);

    for (let row = top; row < bottom; row += 1) {
      pixels.fill(255, (row * width + left) * 4, (row * width + right) * 4);
    }
  }
}
